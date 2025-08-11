import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js"
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js"

const loader = new GLTFLoader()

export function initializeModelLoaders(renderer) {
  const dracoLoader = new DRACOLoader().setDecoderPath("/libs/draco/")
  const ktx2Loader = new KTX2Loader().setTranscoderPath("/libs/basis/").detectSupport(renderer)
  loader.setDRACOLoader(dracoLoader).setKTX2Loader(ktx2Loader)
}

export function loadModel(type, x, y = 0, z, ry = 0, scale = 1, info = null, isCarInHouse = false, state) {
  const { scene, interactiveObjects, obstacles, carModelsLoaded, collisionCubes, dnLights } = state

  loader.load(
    `/models1/compression/${type}.glb`,
    (gltf) => {
      const model = gltf.scene
      model.position.set(x, y, z)
      model.rotation.y = ry
      model.scale.set(scale, scale, scale)

      if (info) {
        model.userData.info = info
        model.userData.isCarInHouse = isCarInHouse
        interactiveObjects.push(model)
      }

      if (type === "house") {
        state.houseModel = model
        model.userData.type = "house"

        setTimeout(() => {
          fixHouseRenderingIssues(state.houseModel)
        }, 100)

        const frontOffset = 5
        const houseDirection = new THREE.Vector3(0, 0, 1)
        houseDirection.applyQuaternion(state.houseModel.quaternion)
        const frontPosition = state.houseModel.position.clone().add(houseDirection.multiplyScalar(frontOffset))
        state.miniPlayer.position.set(frontPosition.x, 0.5, frontPosition.z)
      }

      model.traverse((child) => {
        if (!child.isMesh) return

        if (child.material && child.material.isMeshPhysicalMaterial) {
          child.material = new THREE.MeshStandardMaterial({
            map: child.material.map || null,
            normalMap: child.material.normalMap || null,
            roughnessMap: child.material.roughnessMap || null,
          })
          child.material.needsUpdate = true
        }
        child.castShadow = true
        child.receiveShadow = true
        child.userData.type = type

        if (/^dn[1-6]$/i.test(child.name)) {
          console.log("Found light source:", child.name)

          const spotLight = new THREE.SpotLight(0xffeeaa, 100.0, 15, Math.PI / 4, 0.7)
          spotLight.position.copy(child.getWorldPosition(new THREE.Vector3()))
          spotLight.position.y += 0.09
          spotLight.target.position.copy(child.getWorldPosition(new THREE.Vector3()))
          spotLight.target.position.y -= 2.0
          scene.add(spotLight)
          scene.add(spotLight.target)

          const glow = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xffcc88, transparent: true, opacity: 0.8 }),
          )
          glow.position.copy(spotLight.position)
          glow.position.y -= 0.1
          scene.add(glow)

          dnLights.push({ light: spotLight, glow: glow })

          state.toggleBulbLights(state)
        }

        if (type === "house") {
          if (child.material) {
            child.material = child.material.clone()
            child.material.side = THREE.FrontSide
            child.material.depthWrite = true
            child.material.depthTest = true
            child.material.transparent = false
            child.material.alphaTest = 0

            if (child.material.map) {
              child.material.map.generateMipmaps = true
              child.material.map.minFilter = THREE.LinearMipmapLinearFilter
              child.material.map.magFilter = THREE.LinearFilter
            }

            child.material.needsUpdate = true

            if (child.geometry) {
              child.geometry.computeBoundingBox()
              const box = child.geometry.boundingBox
              if (box) {
                const positions = child.geometry.attributes.position
                const normals = child.geometry.attributes.normal

                if (positions && normals) {
                  for (let i = 0; i < positions.count; i++) {
                    const nx = normals.getX(i)
                    const ny = normals.getY(i)
                    const nz = normals.getZ(i)

                    const offset = 0.001
                    positions.setX(i, positions.getX(i) + nx * offset)
                    positions.setY(i, positions.getY(i) + ny * offset)
                    positions.setZ(i, positions.getZ(i) + nz * offset)
                  }
                  positions.needsUpdate = true
                }
              }
            }
          }
        } else if (type === "ground") {
          // Cải thiện vật liệu cho mặt đất để không bị chói
          if (child.material) {
            child.material = new THREE.MeshStandardMaterial({
              map: child.material.map || null,
              normalMap: child.material.normalMap || null,
              roughnessMap: child.material.roughnessMap || null,
              roughness: 1.0, // Đặt độ nhám cao để hấp thụ ánh sáng
              metalness: 0.0, // Đặt độ kim loại thấp
              color: child.material.color || new THREE.Color(0x808080), // Giữ màu gốc hoặc màu xám mặc định
            })
            child.material.needsUpdate = true
          }
          obstacles.push(child) // Mặt đất cũng là một chướng ngại vật
        } else {
          if (type !== "tree3" && type !== "tree2" && type !== "den1" && type !== "den2" && type !== "den3") {
            obstacles.push(child)
          }
        }

        if (type === "den1" || type === "den2" || type === "den3") {
          child.userData.isLightSource = true
          child.userData.light = null
        }
      })

      if (type === "tree3" || type === "tree2" || type === "den1" || type === "den2" || type === "den3") {
        const boundingBox = new THREE.Box3().setFromObject(model)
        const center = new THREE.Vector3()
        boundingBox.getCenter(center)
        const size = new THREE.Vector3()
        boundingBox.getSize(size)

        let trunkBox
        switch (type) {
          case "tree3":
            trunkBox = new THREE.Mesh(
              new THREE.BoxGeometry(1.0, 2.0, 1.0),
              new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
            )
            trunkBox.position.copy(center)
            trunkBox.position.y -= (size.y - 2.0) / 2
            break

          case "tree2":
            trunkBox = new THREE.Mesh(
              new THREE.BoxGeometry(0.8, 5.5, 0.8),
              new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
            )
            trunkBox.position.copy(center)
            trunkBox.position.y -= (size.y - 1.5) / 2
            trunkBox.position.z -= 1.5
            trunkBox.position.x -= 0.25
            break

          case "den1":
            trunkBox = new THREE.Mesh(
              new THREE.BoxGeometry(0.6, 3.0, 0.6),
              new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
            )
            trunkBox.position.copy(center)
            trunkBox.position.y -= (size.y - 3.0) / 2
            trunkBox.position.x -= 1.4
            break

          case "den2":
            trunkBox = new THREE.Mesh(
              new THREE.BoxGeometry(0.5, 2.5, 0.5),
              new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
            )
            trunkBox.position.copy(center)
            trunkBox.position.y -= (size.y - 2.5) / 2
            trunkBox.position.x -= 1.5
            break

          case "den3":
            trunkBox = new THREE.Mesh(
              new THREE.BoxGeometry(0.5, 3.5, 0.5),
              new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
            )
            trunkBox.position.copy(center)
            trunkBox.position.y -= (size.y - 2.5) / 2
            break
        }

        if (trunkBox) {
          trunkBox.userData.type = `${type}Trunk`
          collisionCubes.push(trunkBox)
          scene.add(trunkBox)
        }
      }

      if (type === "zil1" || type === "xequansu") {
        model.userData.boundingBox = new THREE.Box3().setFromObject(model)
        carModelsLoaded.push(model)
      }
      scene.add(model)

      if (type === "ground") {
        // Tính toán và gán groundBoundingBox sau khi ground model được thêm vào scene
        state.groundBoundingBox = new THREE.Box3().setFromObject(model)
        console.log("Ground model loaded and groundBoundingBox set:", state.groundBoundingBox)
        // Kích hoạt sự kiện groundLoaded
        state.renderer.domElement.dispatchEvent(new Event("groundLoaded"))
      }

      if (["den1", "den2", "den3"].includes(type)) {
        state.toggleBulbLights(state)
      }
    },
    undefined,
    (err) => console.error(`❌ Lỗi load ${type}.glb`, err),
  )
}

export function fixHouseRenderingIssues(houseModel) {
  if (!houseModel) return

  houseModel.traverse((child) => {
    if (child.isMesh && child.material) {
      child.castShadow = true
      child.receiveShadow = true

      child.material.side = THREE.FrontSide
      child.material.depthWrite = true
      child.material.depthTest = true
      child.material.transparent = false
      child.material.color.multiplyScalar(0.3)

      if (child.material.map) {
        child.material.map.flipY = false
        child.material.map.needsUpdate = true
      }

      child.material.needsUpdate = true

      if (child.geometry) {
        child.geometry.computeVertexNormals()
        child.geometry.computeBoundingBox()
        child.geometry.computeBoundingSphere()
      }
    }
  })

  houseModel.updateMatrixWorld(true)
}
