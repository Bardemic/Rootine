import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import styles from './Garden3D.module.css'
import { useAppState } from '../../AppStateProvider/AppStateProvider'
import { trpc } from '../../../lib/trpc'

export function Garden3D({ onEditSign }: { onEditSign?: (id: string) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const { garden } = useAppState()
  const rebuildRef = useRef<null | ((items: { type: string; slot?: number; id?: string; imageUrl?: string }[]) => void)>(null)
  const utils = trpc.useUtils()
  const moveFlowerMutation = (trpc as any).flowers?.moveFlower?.useMutation?.()
  const gardenRef = useRef(garden)
  useEffect(() => { gardenRef.current = garden }, [garden])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const width = (rect.width || container.clientWidth || container.parentElement?.clientWidth || window.innerWidth)
    const height = (rect.height || container.clientHeight || container.parentElement?.clientHeight || window.innerHeight)

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0xfff7fb, 60, 180)

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000)
    camera.position.set(0, 16, 26)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0xf0fff7, 1)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    // @ts-ignore - newer three uses outputColorSpace
    renderer.outputColorSpace = (THREE as any).SRGBColorSpace ?? (THREE as any).sRGBEncoding
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    ;(renderer as any).physicallyCorrectLights = true
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    // Postprocessing (Bloom)
    const composer = new EffectComposer(renderer)
    composer.setSize(width, height)
    const renderPass = new RenderPass(scene, camera)
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.18, 0.22, 0.9)
    composer.addPass(renderPass)
    composer.addPass(bloomPass)

    // Lights
    const hemiLight = new THREE.HemisphereLight(0xfff0f6 as any, 0xcdfae9 as any, 0.7)
    scene.add(hemiLight)
    const dirLight = new THREE.DirectionalLight(0xffd6a5 as any, 1.0)
    dirLight.position.set(6, 12, 6)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.set(1024, 1024)
    dirLight.shadow.camera.near = 1
    dirLight.shadow.camera.far = 60
    dirLight.shadow.camera.left = -25
    dirLight.shadow.camera.right = 25
    dirLight.shadow.camera.top = 25
    dirLight.shadow.camera.bottom = -25
    scene.add(dirLight)

    // Sky + Sun/Moon
    const skyGeo = new THREE.SphereGeometry(160, 32, 32)
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0xffdfee) },
        bottomColor: { value: new THREE.Color(0xc7fff1) },
        offset: { value: 33 },
        exponent: { value: 0.7 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize( vWorldPosition + vec3(0.0, offset, 0.0) ).y;
          float t = max( pow( max(h, 0.0), exponent ), 0.0 );
          gl_FragColor = vec4( mix( bottomColor, topColor, t ), 1.0 );
        }
      `,
    })
    const sky = new THREE.Mesh(skyGeo, skyMat)
    scene.add(sky)

    const celestialGroup = new THREE.Group()
    scene.add(celestialGroup)
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff2a6 })
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xdfe9ff })
    const celestialSphere = new THREE.Mesh(new THREE.SphereGeometry(1.6, 20, 20), sunMat)
    celestialGroup.add(celestialSphere)

    function applyTimeOfDay() {
      const now = new Date()
      const hour = now.getHours() + now.getMinutes() / 60
      const isNight = hour < 6 || hour >= 20
      if (isNight) {
        ;(sky.material as THREE.ShaderMaterial).uniforms.topColor.value.set(0xcfdcff)
        ;(sky.material as THREE.ShaderMaterial).uniforms.bottomColor.value.set(0xeaf2ff)
        hemiLight.intensity = 0.55
        hemiLight.color.set(0xeaf2ff as any)
        hemiLight.groundColor.set(0xbfe7d9 as any)
        dirLight.intensity = 0.6
        dirLight.color.set(0xcad6ff as any)
        celestialSphere.material = moonMat
        celestialSphere.position.set(-22, 16, -12)
      } else {
        const morning = hour >= 6 && hour < 10
        const evening = hour >= 17 && hour < 20
        if (morning) {
          ;(sky.material as THREE.ShaderMaterial).uniforms.topColor.value.set(0xffe6f2)
          ;(sky.material as THREE.ShaderMaterial).uniforms.bottomColor.value.set(0xd8fff3)
          dirLight.intensity = 0.95
          dirLight.color.set(0xffd6a5 as any)
          celestialSphere.material = sunMat
          celestialSphere.position.set(-14, 12, -12)
        } else if (evening) {
          ;(sky.material as THREE.ShaderMaterial).uniforms.topColor.value.set(0xffd6e8)
          ;(sky.material as THREE.ShaderMaterial).uniforms.bottomColor.value.set(0xd4fff1)
          dirLight.intensity = 0.9
          dirLight.color.set(0xffc38b as any)
          celestialSphere.material = sunMat
          celestialSphere.position.set(14, 11, -12)
        } else {
          ;(sky.material as THREE.ShaderMaterial).uniforms.topColor.value.set(0xdff9ff)
          ;(sky.material as THREE.ShaderMaterial).uniforms.bottomColor.value.set(0xecfff8)
          dirLight.intensity = 1.0
          dirLight.color.set(0xffefc2 as any)
          celestialSphere.material = sunMat
          celestialSphere.position.set(0, 18, -14)
        }
        hemiLight.intensity = 0.7
      }
    }
    applyTimeOfDay()
    const timeInterval = window.setInterval(applyTimeOfDay, 60_000)

    // Ground
    function createGrassTexture(renderer: THREE.WebGLRenderer): THREE.Texture {
      const size = 256
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = size
      const ctx = canvas.getContext('2d')!

      // Base soft gradient greens
      const gradient = ctx.createLinearGradient(0, 0, size, size)
      gradient.addColorStop(0, '#c8f7df')
      gradient.addColorStop(1, '#b6f0d3')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, size, size)

      // Dappled noise
      for (let i = 0; i < 1400; i++) {
        const x = Math.random() * size
        const y = Math.random() * size
        const r = Math.random() * 1.6 + 0.6
        const light = 220 + Math.floor(Math.random() * 20)
        const green = 230 + Math.floor(Math.random() * 15)
        ctx.fillStyle = `rgba(${light - 60}, ${green - 40}, ${light - 120}, 0.18)`
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }

      // Tiny clover/flower dots for cuteness
      const flowerColors = ['#ffd4ec', '#ffe8a3', '#cfe7ff', '#e6ffd8']
      for (let i = 0; i < 80; i++) {
        const x = Math.random() * size
        const y = Math.random() * size
        const color = flowerColors[Math.floor(Math.random() * flowerColors.length)]
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(x, y, Math.random() * 0.9 + 0.6, 0, Math.PI * 2)
        ctx.fill()
      }

      const texture = new THREE.CanvasTexture(canvas)
      ;(texture as any).colorSpace = (THREE as any).SRGBColorSpace ?? (THREE as any).sRGBEncoding
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
      texture.minFilter = THREE.LinearMipMapLinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.generateMipmaps = true
      texture.anisotropy = (renderer.capabilities as any)?.getMaxAnisotropy?.() ?? 4
      texture.needsUpdate = true
      return texture
    }

    const groundGeo = new THREE.PlaneGeometry(60, 60)
    const grassTexture = createGrassTexture(renderer)
    grassTexture.repeat.set(20, 20)
    const groundMat = new THREE.MeshStandardMaterial({ map: grassTexture, roughness: 0.95, metalness: 0 })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = 0
    ground.receiveShadow = true
    scene.add(ground)

    // Planter grid constants (used by fences, paths, and pots)
    const cols = 8
    const rows = 8
    const spacing = 2.2
    const startX = -((cols - 1) * spacing) / 2
    const startZ = -((rows - 1) * spacing) / 2

    // Cute wooden fence around the 8x8 planter plot (surrounds, does not intersect)
    function buildFence() {
      const fenceGroup = new THREE.Group()
      const postMat = new THREE.MeshStandardMaterial({ color: 0xd4a373 as any, roughness: 0.85, metalness: 0.03 })
      const railMat = new THREE.MeshStandardMaterial({ color: 0xe6b389 as any, roughness: 0.8, metalness: 0.03 })

      // compute exact outer edges of pots plus a cute margin
      const potSize = 1.1
      const fenceMargin = 1.2
      const halfWidth = ((cols - 1) * spacing + potSize) / 2 + fenceMargin
      const halfDepth = ((rows - 1) * spacing + potSize) / 2 + fenceMargin

      // Helper to add posts along a line
      function addPosts(start: THREE.Vector3, end: THREE.Vector3, count: number) {
        for (let i = 0; i < count; i++) {
          const t = count === 1 ? 0.5 : i / (count - 1)
          const x = THREE.MathUtils.lerp(start.x, end.x, t)
          const z = THREE.MathUtils.lerp(start.z, end.z, t)
          const post = new THREE.Group()
          const cap = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), postMat)
          cap.position.y = 0.95
          cap.castShadow = true
          const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.9, 12), postMat)
          body.position.y = 0.45
          body.castShadow = true
          body.receiveShadow = true
          post.add(body)
          post.add(cap)
          post.position.set(x, 0, z)
          fenceGroup.add(post)
        }
      }

      // Helper to add two rails between two points
      function addRails(start: THREE.Vector3, end: THREE.Vector3) {
        const direction = new THREE.Vector3().subVectors(end, start)
        const length = direction.length()
        const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
        const axisUp = new THREE.Vector3(0, 1, 0)
        const quaternion = new THREE.Quaternion().setFromUnitVectors(axisUp, direction.clone().normalize())

        const railGeo = new THREE.CylinderGeometry(0.06, 0.06, length, 12)
        const rail1 = new THREE.Mesh(railGeo, railMat)
        rail1.quaternion.copy(quaternion)
        rail1.position.copy(midpoint)
        rail1.position.y = 0.55
        rail1.castShadow = true
        rail1.receiveShadow = true
        fenceGroup.add(rail1)

        const rail2 = new THREE.Mesh(railGeo, railMat)
        rail2.quaternion.copy(quaternion)
        rail2.position.copy(midpoint)
        rail2.position.y = 0.35
        rail2.castShadow = true
        rail2.receiveShadow = true
        fenceGroup.add(rail2)
      }

      const p1 = new THREE.Vector3(-halfWidth, 0, -halfDepth)
      const p2 = new THREE.Vector3(halfWidth, 0, -halfDepth)
      const p3 = new THREE.Vector3(halfWidth, 0, halfDepth)
      const p4 = new THREE.Vector3(-halfWidth, 0, halfDepth)

      const estWidth = halfWidth * 2
      const estDepth = halfDepth * 2
      addPosts(p1, p2, Math.max(2, Math.round(estWidth / 1.1)))
      addPosts(p2, p3, Math.max(2, Math.round(estDepth / 1.1)))
      addPosts(p3, p4, Math.max(2, Math.round(estWidth / 1.1)))
      addPosts(p4, p1, Math.max(2, Math.round(estDepth / 1.1)))

      addRails(p1, p2)
      addRails(p2, p3)
      addRails(p3, p4)
      addRails(p4, p1)

      scene.add(fenceGroup)
    }
    buildFence()

    // Gravel path with stone edging
    function createGravelTexture(renderer: THREE.WebGLRenderer): THREE.Texture {
      const size = 256
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = size
      const ctx = canvas.getContext('2d')!

      ctx.fillStyle = '#eae7df'
      ctx.fillRect(0, 0, size, size)

      for (let i = 0; i < 2800; i++) {
        const x = Math.random() * size
        const y = Math.random() * size
        const r = Math.random() * 1.2 + 0.5
        const g = 210 + Math.floor(Math.random() * 40)
        const c = `rgba(${g}, ${g}, ${g}, ${0.3 + Math.random() * 0.3})`
        ctx.fillStyle = c
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }

      const texture = new THREE.CanvasTexture(canvas)
      ;(texture as any).colorSpace = (THREE as any).SRGBColorSpace ?? (THREE as any).sRGBEncoding
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
      texture.minFilter = THREE.LinearMipMapLinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.generateMipmaps = true
      texture.anisotropy = (renderer.capabilities as any)?.getMaxAnisotropy?.() ?? 4
      texture.needsUpdate = true
      return texture
    }

    function addGravelPath() {
      const pathGroup = new THREE.Group()
      const gravelTex = createGravelTexture(renderer)
      gravelTex.repeat.set(6, 2)
      const pathMat = new THREE.MeshStandardMaterial({ map: gravelTex, roughness: 1, metalness: 0 })

      const pathWidth = 3.2
      const pathLength = 10
      const path = new THREE.Mesh(new THREE.PlaneGeometry(pathWidth, pathLength), pathMat)
      path.rotation.x = -Math.PI / 2
      // place path in front of the grid (towards camera at positive Z)
      const potSize = 1.1
      const gridHalfDepth = ((rows - 1) * spacing + potSize) / 2
      path.position.set(0, 0.005, gridHalfDepth + pathLength / 2 - 1.2)
      path.receiveShadow = true
      pathGroup.add(path)

      // Rounded stone edging along the sides
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0xdedede as any, roughness: 0.95, metalness: 0.02 })
      const stoneGeo = new THREE.SphereGeometry(0.18, 12, 12)
      const count = Math.floor(pathLength / 0.35)
      const leftX = -pathWidth / 2 - 0.1
      const rightX = pathWidth / 2 + 0.1
      const startZ = path.position.z - pathLength / 2
      for (let i = 0; i <= count; i++) {
        const z = startZ + i * 0.35
        const jitterX = (Math.random() - 0.5) * 0.06
        const jitterZ = (Math.random() - 0.5) * 0.06
        const stoneL = new THREE.Mesh(stoneGeo, stoneMat)
        stoneL.position.set(leftX + jitterX, 0.09, z + jitterZ)
        stoneL.castShadow = true
        stoneL.receiveShadow = true
        pathGroup.add(stoneL)
        const stoneR = stoneL.clone()
        stoneR.position.x = rightX + (Math.random() - 0.5) * 0.06
        pathGroup.add(stoneR)
      }

      scene.add(pathGroup)
    }
    addGravelPath()

    // Planter grid (8x8)

    const potGroup = new THREE.Group()
    scene.add(potGroup)

    const pots: THREE.Group[] = []
    const plantHolders: THREE.Group[] = []
    const pickMeshes: THREE.Mesh[] = []
    const targetScales: number[] = new Array(rows * cols).fill(1)

    function makeShadowTexture(): THREE.Texture {
      const c = document.createElement('canvas')
      const size = 256
      c.width = c.height = size
      const ctx = c.getContext('2d')!
      const g = ctx.createRadialGradient(size/2, size/2, 10, size/2, size/2, size/2)
      g.addColorStop(0, 'rgba(0,0,0,0.22)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.fillRect(0,0,size,size)
      const tex = new THREE.Texture(c)
      tex.needsUpdate = true
      tex.minFilter = THREE.LinearFilter
      tex.magFilter = THREE.LinearFilter
      tex.wrapS = THREE.ClampToEdgeWrapping
      tex.wrapT = THREE.ClampToEdgeWrapping
      return tex
    }
    const shadowTexture = makeShadowTexture()

    function createPot(potIndex: number): THREE.Group {
      const group = new THREE.Group()

      const potMat = new THREE.MeshStandardMaterial({ color: 0x9b6b3b, roughness: 0.85, metalness: 0.05 })
      const potMesh = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 1.1), potMat)
      potMesh.position.y = 0.25
      potMesh.castShadow = true
      potMesh.receiveShadow = true
      potMesh.userData.potIndex = potIndex
      group.add(potMesh)

      const soil = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshStandardMaterial({ color: 0x3f2d1c, roughness: 1 }))
      soil.rotation.x = -Math.PI / 2
      soil.position.y = 0.26
      soil.receiveShadow = true
      group.add(soil)

      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, opacity: 0.45 }))
      shadow.rotation.x = -Math.PI / 2
      shadow.position.y = 0.01
      shadow.renderOrder = -1
      group.add(shadow)

      const plantHolder = new THREE.Group()
      plantHolder.position.y = 0.26
      group.add(plantHolder)

      plantHolders[potIndex] = plantHolder
      pickMeshes[potIndex] = potMesh
      pots[potIndex] = group
      return group
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c
        const pot = createPot(idx)
        pot.position.set(startX + c * spacing, 0, startZ + r * spacing)
        potGroup.add(pot)
      }
    }

    function makeFlower(color: number, height: number, petal: number) {
      const group = new THREE.Group()

      const stemGeo = new THREE.CylinderGeometry(0.06, 0.06, height, 12)
      const stemMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.9, metalness: 0.05 })
      const stem = new THREE.Mesh(stemGeo, stemMat)
      stem.position.y = height / 2
      stem.castShadow = true
      group.add(stem)

      const centerGeo = new THREE.SphereGeometry(0.18, 16, 16)
      const centerMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.4, metalness: 0.2, emissive: 0xffc94a, emissiveIntensity: 0.08 })
      const center = new THREE.Mesh(centerGeo, centerMat)
      center.position.y = height
      center.castShadow = true
      group.add(center)

      const petalGeo = new THREE.SphereGeometry(0.16, 16, 16)
      const petalMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.08 })
      const petals = new THREE.Group()
      const count = petal
      for (let i = 0; i < count; i++) {
        const p = new THREE.Mesh(petalGeo, petalMat)
        const angle = (i / count) * Math.PI * 2
        p.position.set(Math.cos(angle) * 0.28, height, Math.sin(angle) * 0.28)
        p.castShadow = true
        petals.add(p)
      }
      group.add(petals)
      return group
    }

    const textureLoader = new THREE.TextureLoader()
    ;(textureLoader as any).setCrossOrigin?.('anonymous')
    function rebuild(items: { type: string; slot?: number; id?: string; imageUrl?: string }[]) {
      // Clear previous plants
      plantHolders.forEach(holder => holder?.clear())
      for (const it of items) {
        const slot = typeof (it as any).slot === 'number' ? (it as any).slot as number : 0
        if (slot < 0 || slot >= rows * cols) continue
        const holder = plantHolders[slot]
        if (!holder) continue
        const type = it.type
        let group: THREE.Group
        if (type === 'flower1' || type === 'flower2' || type === 'flower3') {
          group = type === 'flower1'
            ? makeFlower(0xf472b6, 1.2, 8)
            : type === 'flower2'
            ? makeFlower(0xfacc15, 1.0, 6)
            : makeFlower(0xf43f5e, 1.4, 10)
          group.rotation.y = Math.random() * Math.PI
        } else if (type === 'imageSign') {
          // imageSign: small signpost with a framed plane showing image
          group = new THREE.Group()
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 12), new THREE.MeshStandardMaterial({ color: 0x8d6e63 as any, roughness: 0.9 }))
          pole.position.y = 1.1
          pole.castShadow = true
          pole.receiveShadow = true
          group.add(pole)

          const frame = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.95, 0.06), new THREE.MeshStandardMaterial({ color: 0x5d4037 as any, roughness: 0.8 }))
          frame.position.set(0, 1.9, 0)
          frame.rotation.x = -Math.PI / 16
          frame.castShadow = true
          frame.receiveShadow = true
          group.add(frame)
          // add a thin black backboard slightly behind the picture to ensure contrast
          const backboard = new THREE.Mesh(new THREE.PlaneGeometry(0.82 * 6, 0.56 * 6), new THREE.MeshBasicMaterial({ color: 0x000000 }))
          backboard.position.set(0, 1.9, -0.02)
          backboard.rotation.x = -Math.PI / 16
          group.add(backboard)

          const rawUrl = (it as any).imageUrl || 'https://placehold.co/256x256'
          const proxied = `/api/proxy-image?url=${encodeURIComponent(rawUrl)}`
          const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
          mat.depthWrite = false
          mat.depthTest = false
          const imageTex = new THREE.Texture()
          imageTex.colorSpace = (THREE as any).SRGBColorSpace ?? (THREE as any).sRGBEncoding
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            imageTex.image = img
            imageTex.needsUpdate = true
            mat.map = imageTex
            ;(mat as any).needsUpdate = true
          }
          img.onerror = () => {
            // fallback solid color shows the frame is visible
            mat.map = null as any
          }
          img.src = proxied
          const picture = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.52), mat)
          picture.position.set(0, 1.9, 0.3)
          picture.rotation.x = -Math.PI / 16
          picture.scale.set(-6, 6, 1)
          picture.renderOrder = 1000
          group.add(picture)
          ;(group as any).userData = { isSign: true }
          // Face the camera (-Z direction) to be safe
          group.rotation.y = Math.PI
        } else if (type === 'tallImage') {
          group = new THREE.Group()
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.8, 24), new THREE.MeshStandardMaterial({ color: 0x8d6e63 as any, roughness: 0.9 }))
          pole.position.y = 2.4
          pole.castShadow = true
          pole.receiveShadow = true
          group.add(pole)

          const frame = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.95, 0.06), new THREE.MeshStandardMaterial({ color: 0x5d4037 as any, roughness: 0.8 }))
          frame.position.set(0, 3.4, 0)
          frame.rotation.x = -Math.PI / 16
          frame.castShadow = true
          frame.receiveShadow = true
          group.add(frame)

          const backboard = new THREE.Mesh(new THREE.PlaneGeometry(0.82 * 6, 0.56 * 6), new THREE.MeshBasicMaterial({ color: 0x000000 }))
          backboard.position.set(0, 3.4, -0.02)
          backboard.rotation.x = -Math.PI / 16
          group.add(backboard)

          const rawUrl = (it as any).imageUrl || 'https://placehold.co/256x256'
          const proxied = `/api/proxy-image?url=${encodeURIComponent(rawUrl)}`
          const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 1 })
          mat.depthWrite = false
          mat.depthTest = false
          const imageTex = new THREE.Texture()
          imageTex.colorSpace = (THREE as any).SRGBColorSpace ?? (THREE as any).sRGBEncoding
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            imageTex.image = img
            imageTex.needsUpdate = true
            mat.map = imageTex
            ;(mat as any).needsUpdate = true
          }
          img.onerror = () => {
            mat.map = null as any
          }
          img.src = proxied
          const picture = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.52), mat)
          picture.position.set(0, 3.4, 0.3)
          picture.rotation.x = -Math.PI / 16
          picture.scale.set(-6, 6, 1)
          picture.renderOrder = 1000
          group.add(picture)
          ;(group as any).userData = { isSign: true }
          group.rotation.y = Math.PI
        } else {
          group = new THREE.Group()
        }
        ;(group as any).userData = { ...(group as any).userData, slot, id: (it as any).id, type }
        holder.add(group)
      }
    }
    rebuildRef.current = rebuild

    rebuild(garden.items)

    // Hover/selection interactions (pointer raycaster)
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let hoveredIndex: number | null = null
    let selectedSlot: number | null = null
    let selectedItemId: string | null = null
    let selectedType: string | null = null
    let dragging = false
    let lastPointerType: string | null = null
    let dragGhost: THREE.Group | null = null
    let selectedGlow: THREE.Mesh | null = null
    let hoverRing: THREE.Mesh | null = null
    let draggedOriginal: THREE.Object3D | null = null

    function onPointerMove(ev: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      // Start drag on first movement for fine pointers
      if (selectedItemId && !dragging) {
        const isFinePointer = lastPointerType === 'mouse' || (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: fine)').matches)
        if (isFinePointer && selectedType) {
          if (typeof selectedSlot === 'number') {
            const holder = plantHolders[selectedSlot]
            const plantGroup = holder?.children.find((ch: any) => (ch as any)?.userData?.id === selectedItemId)
            if (plantGroup) {
              draggedOriginal = plantGroup as THREE.Object3D
              try { (draggedOriginal as any).visible = false } catch {}
            }
          }
          const ghost = selectedType === 'flower1'
            ? makeFlower(0xf472b6, 1.2, 8)
            : selectedType === 'flower2'
            ? makeFlower(0xfacc15, 1.0, 6)
            : selectedType === 'flower3'
            ? makeFlower(0xf43f5e, 1.4, 10)
            : (() => {
                const g = new THREE.Group()
                const tall = selectedType === 'tallImage'
                const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, tall ? 4.8 : 2.2, 12), new THREE.MeshStandardMaterial({ color: 0x8d6e63 as any, roughness: 0.9 }))
                pole.position.y = tall ? 2.4 : 1.1
                g.add(pole)
                const frame = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.95, 0.06), new THREE.MeshStandardMaterial({ color: 0x5d4037 as any, roughness: 0.8 }))
                frame.position.set(0, tall ? 3.4 : 1.9, 0)
                frame.rotation.x = -Math.PI / 16
                g.add(frame)
                const picture = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.52), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }))
                picture.position.set(0, tall ? 3.4 : 1.9, 0.24)
                picture.rotation.x = -Math.PI / 16
                picture.scale.set(-6, 6, 1)
                g.add(picture)
                g.rotation.y = Math.PI
                return g
              })()
          ghost.traverse((obj: any) => {
            if ((obj as any).isMesh && (obj as any).material) {
              const m = ((obj as any).material as any)
              ;(obj as any).material = m.clone()
              ;(obj as any).material.transparent = true
              ;(obj as any).material.opacity = 0.8
            }
          })
          dragGhost = ghost
          scene.add(ghost)
          dragging = true
          ;(renderer.domElement.style as any).cursor = 'grabbing'
        }
      }
      const intersects = raycaster.intersectObjects(pickMeshes, false)
      const mesh = intersects[0]?.object as THREE.Mesh | undefined
      const newIndex = typeof mesh?.userData?.potIndex === 'number' ? mesh!.userData.potIndex as number : null
      if (newIndex !== hoveredIndex) {
        if (hoveredIndex !== null) targetScales[hoveredIndex] = 1
        hoveredIndex = newIndex
        if (hoveredIndex !== null) targetScales[hoveredIndex] = 1.2
      }
      // Show hover ring if selected and target is empty
      if (selectedItemId && hoveredIndex !== null) {
        const g = gardenRef.current
        const occupied = g.items.find(it => it.slot === hoveredIndex)
        const droppable = !occupied && (selectedSlot === null || hoveredIndex !== selectedSlot)
        if (droppable) {
          const pot = pots[hoveredIndex]
          if (!hoverRing) {
            const ringGeo = new THREE.RingGeometry(0.7, 0.95, 32)
            const ringMat = new THREE.MeshStandardMaterial({ color: 0xffa6d6 as any, emissive: 0xff7fc2 as any, emissiveIntensity: 0.9, transparent: true, opacity: 0.85 })
            hoverRing = new THREE.Mesh(ringGeo, ringMat)
            hoverRing.rotation.x = -Math.PI / 2
            hoverRing.position.y = 0.28
          }
          if (hoverRing.parent !== pot) {
            if (hoverRing.parent) hoverRing.parent.remove(hoverRing)
            pot.add(hoverRing)
          }
        } else {
          if (hoverRing && hoverRing.parent) hoverRing.parent.remove(hoverRing)
          hoverRing = null
        }
      } else if (hoverRing) {
        if (hoverRing.parent) hoverRing.parent.remove(hoverRing)
        hoverRing = null
      }
    }
    function onPointerLeave() {
      if (hoveredIndex !== null) targetScales[hoveredIndex] = 1
      hoveredIndex = null
      updateDragGhost()
      if (hoverRing) {
        const parent = hoverRing.parent
        if (parent) parent.remove(hoverRing)
        hoverRing = null
      }
    }
    function clearSelection(revert = true) {
      if (selectedSlot !== null) targetScales[selectedSlot] = 1
      if (dragGhost) {
        scene.remove(dragGhost)
        dragGhost = null
      }
      if (selectedGlow) {
        const parent = selectedGlow.parent
        if (parent) parent.remove(selectedGlow)
        selectedGlow = null
      }
      if (hoverRing) {
        const parent = hoverRing.parent
        if (parent) parent.remove(hoverRing)
        hoverRing = null
      }
      if (draggedOriginal) {
        if (revert) {
          try { draggedOriginal.visible = true } catch {}
        }
      }
      draggedOriginal = null
      selectedSlot = null
      selectedItemId = null
      selectedType = null
      dragging = false
      lastPointerType = null
    }
    function tryMoveTo(slotIndex: number | null) {
      const g = gardenRef.current
      if (!selectedItemId) return
      if (slotIndex === null) { clearSelection(); return }
      if (selectedSlot === slotIndex) { clearSelection(); return }
      const occupied = g.items.find(it => it.slot === slotIndex)
      if (occupied) { clearSelection(); return }
      const x = slotIndex % cols
      const y = Math.floor(slotIndex / cols)
      // Remove visuals and keep original hidden until mutation completes
      if (dragGhost) { scene.remove(dragGhost); dragGhost = null }
      if (hoverRing) { const p = hoverRing.parent; if (p) p.remove(hoverRing); hoverRing = null }
      if (selectedGlow) { const p = selectedGlow.parent; if (p) p.remove(selectedGlow); selectedGlow = null }
      ;(renderer.domElement.style as any).cursor = 'default'
      ;(moveFlowerMutation as any)?.mutate?.(
        { id: selectedItemId, position: [x, y] },
        {
          onSuccess: () => {
            ;(utils as any).flowers?.getFlowers?.invalidate?.()
            clearSelection(false)
          },
          onError: () => {
            clearSelection(true)
          },
        },
      )
    }
    function onPointerDown(ev: PointerEvent) {
      // If a flower is already selected, a new tap on an empty pot moves it (mobile support)
      if (selectedItemId) {
        tryMoveTo(hoveredIndex)
        return
      }
      if (hoveredIndex === null) return
      const g = gardenRef.current
      const item = g.items.find(it => it.slot === hoveredIndex!)
      if (item) {
        selectedSlot = hoveredIndex
        selectedItemId = item.id
        selectedType = item.type as any
        targetScales[hoveredIndex] = 1.25
        // Add glow ring for selection (useful on mobile)
        const ringGeo = new THREE.RingGeometry(0.7, 0.95, 32)
        const ringMat = new THREE.MeshStandardMaterial({ color: 0xffa6d6 as any, emissive: 0xff7fc2 as any, emissiveIntensity: 0.9, transparent: true, opacity: 0.85 })
        selectedGlow = new THREE.Mesh(ringGeo, ringMat)
        selectedGlow.rotation.x = -Math.PI / 2
        selectedGlow.position.y = 0.28
        const pot = pots[hoveredIndex]
        pot.add(selectedGlow)

        lastPointerType = ev.pointerType || null
        // Do not start dragging yet; wait for pointer movement
        const isFinePointer = lastPointerType === 'mouse' || (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: fine)').matches)
        dragging = false
        if (false && isFinePointer && selectedType) {
          // Hide original plant while dragging to avoid duplicate
          // (dead path left intentionally disabled)
          const ghost = selectedType === 'flower1'
            ? makeFlower(0xf472b6, 1.2, 8)
            : selectedType === 'flower2'
            ? makeFlower(0xfacc15, 1.0, 6)
            : selectedType === 'flower3'
            ? makeFlower(0xf43f5e, 1.4, 10)
            : (() => {
                const g = new THREE.Group()
                const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 12), new THREE.MeshStandardMaterial({ color: 0x8d6e63 as any, roughness: 0.9 }))
                pole.position.y = 0.5
                g.add(pole)
                const frame = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.65, 0.06), new THREE.MeshStandardMaterial({ color: 0x5d4037 as any, roughness: 0.8 }))
                frame.position.set(0, 0.95, 0)
                g.add(frame)
                const picture = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.52), new THREE.MeshBasicMaterial({ color: 0xffffff }))
                picture.position.set(0, 0.95, 0.035)
                g.add(picture)
                return g
              })()
          ghost.traverse((obj: any) => {
            if (obj.isMesh && obj.material) {
              obj.material = obj.material.clone()
              obj.material.transparent = true
              obj.material.opacity = 0.8
            }
          })
          dragGhost = ghost
          scene.add(ghost)
          // Prime raycaster from this event and position ghost immediately
          const rect = renderer.domElement.getBoundingClientRect()
          pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1
          pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1
          raycaster.setFromCamera(pointer, camera)
          updateDragGhost()
          ;(renderer.domElement.style as any).cursor = 'grabbing'
        }
      }
    }
    function onPointerUp(_ev: PointerEvent) {
      if (!selectedItemId) return
      // If a sign was tapped (no hover target change), open settings instead of moving
      if (!dragging && (selectedType === 'imageSign' || selectedType === 'tallImage')) {
        try {
          onEditSign?.(selectedItemId)
        } catch {}
        clearSelection(false)
        ;(renderer.domElement.style as any).cursor = 'default'
        return
      }
      tryMoveTo(hoveredIndex)
      ;(renderer.domElement.style as any).cursor = 'default'
    }
    function updateDragGhost() {
      if (!dragGhost) return
      // Always follow the cursor projected onto ground plane for smooth desktop dragging
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0) // y = 0
      const hit = new THREE.Vector3()
      const hasPoint = raycaster.ray.intersectPlane(plane, hit)
      if (hasPoint) {
        dragGhost.position.set(hit.x, 0.26, hit.z)
      }
    }
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerleave', onPointerLeave)
    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointerup', onPointerUp)
    renderer.domElement.addEventListener('pointercancel', onPointerUp)

    // Animation loop
    const clock = new THREE.Clock()
    function animate() {
      const t = clock.getElapsedTime()
      // gentle bob for planted items
      for (let i = 0; i < plantHolders.length; i++) {
        const holder = plantHolders[i]
        if (!holder) continue
        const hasPlant = holder.children.length > 0
        holder.position.y = 0.26 + (hasPlant ? Math.sin(t * 1.2 + i) * 0.05 : 0)
      }
      // ease pot scales
      for (let i = 0; i < pots.length; i++) {
        const pot = pots[i]
        if (!pot) continue
        const s = pot.scale.x
        const target = targetScales[i]
        const next = s + (target - s) * 0.12
        pot.scale.setScalar(next)
      }
      // While dragging on desktop, keep ghost synced to pointer
      if (dragging) updateDragGhost()
      composer.render()
      raf = requestAnimationFrame(animate)
    }
    let raf = requestAnimationFrame(animate)

    function onResize() {
      if (!container) return
      const r = container.getBoundingClientRect()
      const w = (r.width || container.clientWidth || container.parentElement?.clientWidth || window.innerWidth)
      const h = (r.height || container.clientHeight || container.parentElement?.clientHeight || window.innerHeight)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      composer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      renderer.domElement.removeEventListener('pointercancel', onPointerUp)
      window.clearInterval(timeInterval)
      renderer.dispose()
      container.innerHTML = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Rebuild plants when items change
  useEffect(() => {
    if (rebuildRef.current) {
      rebuildRef.current(garden.items as any)
    }
  }, [garden.items])

  return <div ref={containerRef} className={styles.container} style={{ width: '100%', height: '100%' }} />
}


