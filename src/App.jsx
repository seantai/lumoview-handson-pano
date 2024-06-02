import { Canvas, useThree } from '@react-three/fiber'
import { Bvh, CameraControls, Html, useTexture } from '@react-three/drei'
import { EquirectangularReflectionMapping, MathUtils, SRGBColorSpace, Vector3, Object3D } from 'three'
import { useCallback, useEffect, useRef, useState } from 'react'
import { proxy, useSnapshot } from 'valtio'
import autosize from 'autosize'
import { isMobile } from 'react-device-detect'
import { motion } from 'framer-motion'
// import { Perf } from 'r3f-perf'

const markerStore = proxy({
  markers: []
})

// using the inside of a sphere to show the equirectangular image
const Panorama = () => {
  const markerSnapshot = useSnapshot(markerStore)

  const [pointerDown, setPointerDown] = useState(false)

  const panoTexture = useTexture('R0010121.JPG.webp', (t) => {
    t.colorSpace = SRGBColorSpace
    t.mapping = EquirectangularReflectionMapping
  })

  const lastTapTimeRef = useRef(0)

  //either CTRL + Click for Desktop, or Double Tab for Mobile
  const handleAddComment = useCallback((event) => {
    const currentTime = Date.now()
    const timeSinceLastTap = currentTime - lastTapTimeRef.current

    if (timeSinceLastTap < 300 && event.pointerType !== 'mouse') {
      createMarker(event)
    }

    if (event.ctrlKey || event.metaKey) {
      createMarker(event)
    }

    lastTapTimeRef.current = currentTime

    setPointerDown(true)
  }, [])

  const createMarker = (event) => {
    const marker = new Object3D()
    const markerId = MathUtils.generateUUID()
    marker.userData.id = markerId

    marker.position.copy(event.point)

    const directionVector = new Vector3().subVectors(marker.position, new Vector3(0, 0, 0)).normalize()

    marker.lookAt(directionVector)

    markerStore.markers.push(marker)
  }

  //change cursor
  useEffect(() => {
    if (pointerDown) {
      document.body.style.cursor = 'grabbing'
    } else {
      document.body.style.cursor = 'grab'
    }
    return () => void (document.body.style.cursor = 'grab')
  }, [pointerDown])

  return (
    <>
      {/* using webgl to add comment markers / text */}

      {/* the panorama */}
      <mesh onPointerDown={handleAddComment} onPointerUp={() => setPointerDown(false)} scale-x={-1}>
        <icosahedronGeometry args={[6, 70]} />
        <meshBasicMaterial map={panoTexture} side={2} toneMapped={false} />
      </mesh>

      {/* the comments */}
      {markerSnapshot.markers.map((marker) => {
        return <Comment {...{ marker }} key={marker.userData.id} />
      })}
    </>
  )
}

const Comment = ({ marker }) => {
  const [text, setText] = useState('')

  const handleChange = (event) => {
    setText(event.target.value)
  }

  const handleBlur = (event) => {
    event.target.blur()
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.target.blur()
    }
  }

  return (
    <mesh position={marker.position} rotation={marker.rotation}>
      <icosahedronGeometry args={[0.2, 10, 10]} />
      <meshMatcapMaterial color="#FE3B1F" />
      <Html position={[-0.1, -0.3, 0]}>
        <textarea
          ref={(textarea) => {
            if (textarea) {
              autosize(textarea)
            }
          }}
          type="text"
          autoFocus
          rows="1"
          value={text}
          placeholder="Enter Comment"
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          spellCheck={false}
          className={`px-4 py-3 rounded-md border-0 text-base text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-100 focus:ring-offset-gray-900 h-10 resize-none overflow-hidden bg-slate-300 focus:bg-slate-200 font-medium`}
        />
      </Html>
    </mesh>
  )
}

const Scene = () => {
  //inital spin
  const { controls } = useThree()
  useEffect(() => {
    if (!controls) return
    controls.rotate(360 * MathUtils.DEG2RAD, 0, true)
  }, [controls])

  return (
    <>
      <Panorama />

      <CameraControls
        makeDefault
        maxDistance={5.7}
        azimuthRotateSpeed={-1}
        polarRotateSpeed={-1}
        minPolarAngle={MathUtils.DEG2RAD * 70}
        maxPolarAngle={MathUtils.DEG2RAD * 130}
        mouseButtons={{ left: 1, middle: 0, right: 0, wheel: 8 }}
        touches={{ one: 1, two: 0, three: 0 }}
        smoothTime={0.9}
      />
    </>
  )
}

export default function App() {
  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ fov: 50 }}>
        <Bvh firstHitOnly>
          <Scene />
        </Bvh>
        {/* <Perf /> */}
      </Canvas>
      <Tutorial />
    </div>
  )
}

const Tutorial = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed pt-40 py-40 pb-10 md:pb-20 font-semibold text-2xl flex flex-col items-center justify-end w-full h-full inset-0 pointer-events-none select-none ">
      <div className="bg-[#111] bg-opacity-75 py-4 px-5 rounded-xl border border-[#ef7975] flex flex-col items-start justify-center space-y-3 ">
        <div className="text-[#FE3B1F] flex space-x-3 items-baseline">
          <span className="text-[#ef7975]">&#x2022;</span>
          <p>DRAG</p>
          <p className="text-xl text-[#ddbebe]">to rotate image</p>
        </div>
        <div className="text-[#FE3B1F] flex space-x-3 items-baseline">
          <span className="text-[#ef7975]">&#x2022;</span>
          {!isMobile ? (
            <>
              <div className="border rounded-xl border-[#FE3B1F] px-2 py-[2px]">CTRL / CMD</div>
              <div className="py-[2px]">+ CLICK</div>
            </>
          ) : (
            <div className="border rounded-xl border-[#FE3B1F] px-2 py-[2px]">DOUBLE TAP</div>
          )}
          <p className="text-xl text-[#ddbebe]">to add comment</p>
        </div>
      </div>
    </motion.div>
  )
}
