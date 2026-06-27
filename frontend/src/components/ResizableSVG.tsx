import { useCallback, useRef, useState } from 'react'
import { ReactSVG } from 'react-svg'

const MIN_SIZE = 10 // percent
const MAX_SIZE = 100 // percent

// Adds a handle to the lower right corner of an SVG image that can be used to resize the image.
export function ResizableSVG({
    src,
    defaultSize,
    afterInjection
}: {
    src: string
    defaultSize: number
    afterInjection: (svg: SVGSVGElement) => void
}) {
    const svgSizeRef = useRef<number>(defaultSize)
    const [svgSize, setSvgSize] = useState<number>(svgSizeRef.current)
    const svgMaxWHRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 })
    const dragStateRef = useRef<boolean>(false)
    const wrapperRef = useRef<HTMLDivElement>(null)

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        dragStateRef.current = true
        const wrapperRect = wrapperRef.current?.getBoundingClientRect()
        if (!wrapperRect) return
        svgMaxWHRef.current = {
            w: (wrapperRect.width * 100) / svgSizeRef.current,
            h: (wrapperRect.height * 100) / svgSizeRef.current
        }
    }, [])

    const onPointerMove = useCallback(
        (e: React.PointerEvent) => {
            if (!dragStateRef.current || !wrapperRef.current) return

            const wrapperRect = wrapperRef.current.getBoundingClientRect()

            // Distance from wrapper's top-left origin to cursor
            const cursorX = e.clientX - wrapperRect.left
            const cursorY = e.clientY - wrapperRect.top

            // Convert cursor position to container-relative percentages
            const sizeFromX = (100 * cursorX) / svgMaxWHRef.current.w
            const sizeFromY = (100 * cursorY) / svgMaxWHRef.current.h

            // Use whichever axis the cursor is closest to: right edge → X drives, bottom edge → Y drives
            const newSize = Math.min(
                MAX_SIZE,
                Math.max(
                    MIN_SIZE,
                    sizeFromX, // cursor is near the right edge
                    sizeFromY
                )
            )

            svgSizeRef.current = newSize
            setSvgSize(newSize)
        },
        [wrapperRef]
    )

    const onPointerUp = useCallback(() => {
        dragStateRef.current = false
    }, [])

    return (
        <div
            ref={wrapperRef}
            style={{ position: 'relative', display: 'inline-block', width: `${svgSize}%`, height: `${svgSize}%` }}
            className="shadow-[4px_4px_6px_rgba(0,0,0,0.15)]">
            <ReactSVG src={src} style={{ width: '100%', height: '100%' }} afterInjection={afterInjection} />

            {/* Drag handle */}
            <div
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 24,
                    height: 24,
                    cursor: 'nwse-resize',
                    overflow: 'hidden',
                    // Stop the browser from treating a touch-drag on the handle as a
                    // scroll/zoom gesture (which suppresses pointermove on mobile).
                    touchAction: 'none'
                }}>
                {[0, 6].map((offset) => (
                    <div
                        key={offset}
                        style={{
                            position: 'absolute',
                            bottom: 6 + offset,
                            right: -14 + offset,
                            width: 28,
                            height: 1.5,
                            background: '#aaa',
                            transform: 'rotate(-45deg)',
                            borderRadius: 1
                        }}
                    />
                ))}
            </div>
        </div>
    )
}
