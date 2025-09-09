import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { pool } from '../db';
import { TRPCError } from '@trpc/server';
import { verifyImageWithAI } from '../utils/aiVerify';

function generateGroupCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export const groupsRouter = router({
  createGroup: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(64), description: z.string().min(1).max(256) }))
    .mutation(async ({ ctx, input }) => {
      // Generate unique code
      let code: string = generateGroupCode();
      for (let i = 0; i < 5; i++) {
        const exists = await pool.query('SELECT 1 FROM groups WHERE code = $1', [code]);
        if (exists.rowCount === 0) break;
        code = generateGroupCode();
      }
      // Insert group and add creator as member
      const groupRes = await pool.query(
        'INSERT INTO groups (code, created_by, name, habit_description) VALUES ($1, $2, $3, $4) RETURNING id, code, name, habit_description, created_at',
        [code, ctx.user.id, input.name, input.description],
      );
      const group = groupRes.rows[0];
      await pool.query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [group.id, ctx.user.id]);
      return { id: String(group.id), code: String(group.code), name: String(group.name), description: String(group.habit_description), createdAt: new Date(group.created_at).toISOString() };
    }),

  joinGroup: protectedProcedure
    .input(z.object({ code: z.string().min(4).max(12) }))
    .mutation(async ({ ctx, input }) => {
      const code = input.code.trim().toUpperCase();
      const res = await pool.query('SELECT id FROM groups WHERE code = $1', [code]);
      const groupId = res.rows?.[0]?.id as string | undefined;
      if (!groupId) throw new TRPCError({ code: 'NOT_FOUND', message: 'Group not found' });
      await pool.query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [groupId, ctx.user.id]);
      return { success: true, groupId: String(groupId) };
    }),

  myGroups: protectedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const res = await pool.query(
        `SELECT g.id, g.code, g.created_by, g.name, g.habit_description, g.created_at
         FROM group_members gm
         JOIN groups g ON g.id = gm.group_id
         WHERE gm.user_id = $1
         ORDER BY g.created_at DESC`,
        [ctx.user.id],
      );
      return res.rows.map((r: any) => ({
        id: String(r.id),
        code: String(r.code),
        createdBy: String(r.created_by),
        name: String(r.name),
        description: String(r.habit_description),
        createdAt: new Date(r.created_at).toISOString(),
      }));
    }),

  groupDetail: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .query(async ({ ctx, input }) => {
      // membership check
      const isMember = await pool.query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2', [input.groupId, ctx.user.id]);
      if ((isMember.rowCount ?? 0) === 0) throw new TRPCError({ code: 'UNAUTHORIZED' });

      const gRes = await pool.query('SELECT id, code, name, habit_description FROM groups WHERE id = $1', [input.groupId]);
      const g = gRes.rows?.[0];
      if (!g) throw new TRPCError({ code: 'NOT_FOUND' });

      // uploadedToday (for the current user)
      const todayRes = await pool.query(
        'SELECT COUNT(1) AS cnt FROM group_proofs WHERE group_id = $1 AND user_id = $2 AND created_at::date = CURRENT_DATE',
        [input.groupId, ctx.user.id],
      );
      const uploadedToday = Number(todayRes.rows?.[0]?.cnt || 0) > 0;

      // group streak: count consecutive days from today backwards where ALL members met the daily requirement
      const dailyRequired = 1;
      const perDayRes = await pool.query(
        `WITH days AS (
            SELECT (CURRENT_DATE - i) AS d
            FROM generate_series(0, 180) AS i
         ), members AS (
            SELECT user_id FROM group_members WHERE group_id = $1
         ), per_day AS (
            SELECT d.d AS day,
                   COUNT(DISTINCT m.user_id) FILTER (
                     WHERE EXISTS (
                       SELECT 1 FROM group_proofs gp
                       WHERE gp.group_id = $1 AND gp.user_id = m.user_id AND gp.created_at::date = d.d
                     )
                   ) AS members_with_proof,
                   (SELECT COUNT(*) FROM members) AS total_members
            FROM days d
            CROSS JOIN members m
            GROUP BY d.d
            ORDER BY d.d DESC
         )
         SELECT day, members_with_proof, total_members FROM per_day ORDER BY day DESC`,
        [input.groupId],
      );
      const rows: { day: Date; members_with_proof: number; total_members: number }[] = perDayRes.rows.map((r: any) => ({
        day: new Date(r.day),
        members_with_proof: Number(r.members_with_proof || 0),
        total_members: Number(r.total_members || 0),
      }));
      let streak = 0;
      for (const row of rows) {
        const complete = row.members_with_proof >= row.total_members && row.total_members > 0;
        if (complete) streak += 1; else break;
      }

      // photos history (most recent first)
      const photosRes = await pool.query(
        `SELECT id, image_data_url, created_at
         FROM group_proofs
         WHERE group_id = $1 AND user_id = $2
         ORDER BY created_at DESC
         LIMIT 100`,
        [input.groupId, ctx.user.id],
      );
      const photos = photosRes.rows.map((r: any) => ({ id: String(r.id), url: String(r.image_data_url), createdAt: new Date(r.created_at).toISOString() }));

      // members with today's completion
      const membersRes = await pool.query(
        `SELECT u.id AS user_id,
                COALESCE(u.name, split_part(u.email, '@', 1), 'Member') AS display_name,
                COUNT(gp.id) AS proofs_today
         FROM group_members gm
         JOIN auth.user u ON u.id = gm.user_id
         LEFT JOIN group_proofs gp ON gp.group_id = gm.group_id AND gp.user_id = gm.user_id AND gp.created_at::date = CURRENT_DATE
         WHERE gm.group_id = $1
         GROUP BY u.id, u.name, u.email
         ORDER BY display_name ASC`,
        [input.groupId],
      );
      const members = membersRes.rows.map((r: any) => ({
        id: String(r.user_id),
        name: String(r.display_name),
        doneToday: Number(r.proofs_today) > 0,
        isSelf: String(r.user_id) === String(ctx.user.id),
      }));

      return {
        group: { id: String(g.id), code: String(g.code), name: String(g.name), description: String(g.habit_description) },
        uploadedToday,
        streak,
        photos,
        members,
      };
    }),

  createUploadUrl: protectedProcedure
    .input(z.object({ groupId: z.string(), contentType: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      // Currently not used; file uploads are handled via data URL submit
      return { disabled: true } as any;
    }),

  submitProof: protectedProcedure
    .input(z.object({ groupId: z.string(), dataUrl: z.string(), description: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      // Validate membership
      const isMember = await pool.query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2', [input.groupId, ctx.user.id]);
      if ((isMember.rowCount ?? 0) === 0) throw new TRPCError({ code: 'UNAUTHORIZED' });

      // Enforce per-day submission limit (configurable, default 1)
      const dailyRequired = 1;
      const existingToday = await pool.query(
        `SELECT COUNT(1) AS cnt
         FROM group_proofs
         WHERE group_id = $1 AND user_id = $2 AND created_at::date = CURRENT_DATE`,
        [input.groupId, ctx.user.id],
      );
      const submittedToday = Number(existingToday.rows?.[0]?.cnt || 0);
      if (submittedToday >= dailyRequired) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Daily submission limit reached' });
      }

      const { contentType, buffer } = parseDataUrl(input.dataUrl);
      const fileExt = contentTypeToExt(contentType || 'image/jpeg');
      const key = `group-proofs/${input.groupId}/${ctx.user.id}/${Date.now()}.${fileExt}`;

      // Fetch group for name/description to use as title context
      const gRes = await pool.query('SELECT name, habit_description FROM groups WHERE id = $1', [input.groupId]);
      const grp = gRes.rows?.[0]

      // Run AI verification before persisting
      const verify = await verifyImageWithAI({
        imageUrl: input.dataUrl,
        title: String(grp?.name || 'Group Goal'),
        description: input.description || String(grp?.habit_description || ''),
      })
      if (!verify.ok) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Image verification failed. Please submit a clearer, relevant photo.' })
      }

      // Upload to S3
      const bucket = (process.env.S3_BUCKET || 'rootine') as string;
      const { PutObjectCommand } = await import('@aws-sdk/client-s3');
      const { getS3Client } = await import('../utils/storage');
      const s3 = getS3Client();
      const command = new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType || 'application/octet-stream', ACL: 'public-read' });
      await s3.send(command);

      const publicUrl = buildPublicUrl(key);
      // Save group proof
      await pool.query('INSERT INTO group_proofs (group_id, user_id, image_data_url) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [input.groupId, ctx.user.id, publicUrl]);

      // Try award logic for this group
      await awardGroupCoinsIfAllGroupMembersSubmittedToday(input.groupId);

      return { url: publicUrl, key };
    }),
});

function contentTypeToExt(ct: string): string {
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('heic') || ct.includes('heif')) return 'heic';
  if (ct.includes('gif')) return 'gif';
  return 'jpg';
}

function parseDataUrl(dataUrl: string): { contentType: string | undefined; buffer: Buffer } {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) {
    return { contentType: 'image/jpeg', buffer: Buffer.from(dataUrl.split(',').pop() || dataUrl, 'base64') };
  }
  const [, mime, base64] = match;
  return { contentType: mime, buffer: Buffer.from(base64, 'base64') };
}

function buildPublicUrl(key: string): string {
  const publicBase = sanitizeBaseUrl(process.env.S3_PUBLIC_BASE_URL);
  const region = process.env.S3_REGION || 'us-east-2';
  const bucket = process.env.S3_BUCKET || 'rootine';
  const endpoint = process.env.S3_ENDPOINT;
  const forcePathStyle = (process.env.S3_FORCE_PATH_STYLE || 'false').toLowerCase() === 'true';
  if (publicBase) return `${publicBase.replace(/\/$/, '')}/${key}`;
  if (endpoint) {
    if (forcePathStyle) return `${endpoint.replace(/\/$/, '')}/${bucket}/${encodeURIComponentPath(key)}`;
    return `${endpoint.replace(/\/$/, '')}/${bucket}/${encodeURIComponentPath(key)}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponentPath(key)}`;
}

function encodeURIComponentPath(path: string): string {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function sanitizeBaseUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  let v = String(raw).trim();
  const semi = v.indexOf(';');
  if (semi !== -1) v = v.slice(0, semi);
  const hash = v.indexOf('#');
  if (hash !== -1) v = v.slice(0, hash);
  v = v.replace(/^[\"']+/, '').replace(/[\"']+$/, '').trim();
  if (!/^https?:\/\/[^\/]+(\/.*)?$/i.test(v)) return undefined;
  v = v.replace(/\/+$/, '');
  return v || undefined;
}

async function awardGroupCoinsIfAllGroupMembersSubmittedToday(groupId: string): Promise<void> {
  try {
    const dailyRequired = 1;
    // if already distributed today, exit
    const already = await pool.query('SELECT 1 FROM group_coin_distributions WHERE group_id = $1 AND award_date = CURRENT_DATE', [groupId]);
    if ((already.rowCount ?? 0) > 0) return;

    // members and completions from group_proofs
    const membersRes = await pool.query('SELECT user_id FROM group_members WHERE group_id = $1', [groupId]);
    const memberIds: string[] = membersRes.rows.map((r: any) => String(r.user_id));
    const memberCount = memberIds.length;
    if (memberCount === 0) return;

    const completionRes = await pool.query(
      `SELECT gm.user_id, COUNT(gp.id) AS proofs_today
       FROM group_members gm
       LEFT JOIN group_proofs gp ON gp.group_id = gm.group_id AND gp.user_id = gm.user_id AND gp.created_at::date = CURRENT_DATE
       WHERE gm.group_id = $1
       GROUP BY gm.user_id`,
      [groupId],
    );
    if ((completionRes.rowCount ?? 0) < memberCount) return;
    const allComplete = completionRes.rows.every((r: any) => Number(r.proofs_today) >= dailyRequired);
    if (!allComplete) return;

    const baseReward = 5;
    const multiplier = 1.5 * (memberCount - 1) + 1;
    const perUserAward = Math.round(baseReward * multiplier);

    try {
      await pool.query('BEGIN');
      await pool.query('INSERT INTO group_coin_distributions (group_id, award_date, reward_amount) VALUES ($1, CURRENT_DATE, $2)', [groupId, perUserAward]);
      await pool.query('UPDATE auth.user SET coin = COALESCE(coin, 0) + $2 WHERE id = ANY($1::text[])', [memberIds, perUserAward]);
      await pool.query('COMMIT');
    } catch (e: any) {
      await pool.query('ROLLBACK');
      if (e && e.code !== '23505') {
        console.error('awardGroupCoinsIfAllGroupMembersSubmittedToday failed', groupId, e);
      }
    }
  } catch (e) {
    console.error('awardGroupCoinsIfAllGroupMembersSubmittedToday error', e);
  }
}


