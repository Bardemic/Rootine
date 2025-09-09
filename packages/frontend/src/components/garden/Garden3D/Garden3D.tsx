import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import styles from './Garden3D.module.css'
import { useAppState } from '../../AppStateProvider/AppStateProvider'

export function Garden3D() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const { garden } = useAppState()
  const rebuildRef = useRef<null | ((items: { type: string; slot?: number }[]) => void)>(null)

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
    const groundGeo = new THREE.PlaneGeometry(60, 60)
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xe9fff5, roughness: 0.95, metalness: 0 })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = 0
    ground.receiveShadow = true
    scene.add(ground)

    // Planter grid (8x8)
    const cols = 8
    const rows = 8
    const spacing = 2.2
    const startX = -((cols - 1) * spacing) / 2
    const startZ = -((rows - 1) * spacing) / 2

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

    function rebuild(items: { type: string; slot?: number }[]) {
      // Clear previous plants
      plantHolders.forEach(holder => holder?.clear())
      for (const it of items) {
        const slot = typeof (it as any).slot === 'number' ? (it as any).slot as number : 0
        if (slot < 0 || slot >= rows * cols) continue
        const holder = plantHolders[slot]
        if (!holder) continue
        const type = it.type
        const f = type === 'flower1'
          ? makeFlower(0xf472b6, 1.2, 8)
          : type === 'flower2'
          ? makeFlower(0xfacc15, 1.0, 6)
          : makeFlower(0xf43f5e, 1.4, 10)
        f.rotation.y = Math.random() * Math.PI
        holder.add(f)
      }
    }
    rebuildRef.current = rebuild

    rebuild(garden.items)

    // Hover interactions (pointer raycaster)
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let hoveredIndex: number | null = null

    function onPointerMove(ev: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const intersects = raycaster.intersectObjects(pickMeshes, false)
      const mesh = intersects[0]?.object as THREE.Mesh | undefined
      const newIndex = typeof mesh?.userData?.potIndex === 'number' ? mesh!.userData.potIndex as number : null
      if (newIndex !== hoveredIndex) {
        if (hoveredIndex !== null) targetScales[hoveredIndex] = 1
        hoveredIndex = newIndex
        if (hoveredIndex !== null) targetScales[hoveredIndex] = 1.2
      }
    }
    function onPointerLeave() {
      if (hoveredIndex !== null) targetScales[hoveredIndex] = 1
      hoveredIndex = null
    }
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerleave', onPointerLeave)

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


