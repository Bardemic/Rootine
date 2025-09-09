import { pool } from "../db";
import { Proofs } from "../models/proofs";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { TRPCError } from "@trpc/server";
import { createPresignedUploadUrl } from "../utils/storage";

export const proofsRouter = router({
  getProofs: protectedProcedure.input(z.object({ goalId: z.string() })).query(async ({ ctx, input }) => {
    const getGoal = await pool.query('SELECT * FROM habits WHERE id = $1', [input.goalId]);
    if (ctx.user.id !== getGoal.rows[0]?.user_id) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    const proofs = await pool.query('SELECT * FROM proofs WHERE habit_id = $1 ORDER BY created_at DESC', [input.goalId]);
    // Map to camelCase for frontend expectations
    return proofs.rows.map((r: any) => ({
      id: String(r.id),
      goalId: String(r.habit_id),
      imageDataUrl: String(r.image_data_url),
      createdAt: new Date(r.created_at).toISOString(),
    })) as Proofs[];
  }),
  createUploadUrl: protectedProcedure.input(z.object({ goalId: z.string(), contentType: z.string().optional() })).mutation(async ({ ctx, input }) => {
    try {
      const getGoal = await pool.query('SELECT * FROM habits WHERE id = $1', [input.goalId]);
      if (ctx.user.id !== getGoal.rows[0]?.user_id) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }
      const fileExt = contentTypeToExt(input.contentType || 'image/jpeg');
      const key = `proofs/${ctx.user.id}/${input.goalId}/${Date.now()}.${fileExt}`;
      const { url, headers, fileUrl } = await createPresignedUploadUrl({ key, contentType: input.contentType || 'image/jpeg' });
      // Insert stub record pointing to fileUrl for display after upload completes
      await pool.query('INSERT INTO proofs (habit_id, image_data_url) VALUES ($1, $2)', [input.goalId, fileUrl]);
      return { url, headers, key, fileUrl };
    } catch (err) {
      console.error('createUploadUrl failed', err);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    }
  }),
});

function contentTypeToExt(ct: string): string {
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('heic') || ct.includes('heif')) return 'heic';
  if (ct.includes('gif')) return 'gif';
  return 'jpg';
}