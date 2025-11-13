import { cn } from '../utils/cn'

interface HiveShimmerProps {
  className?: string
}

// SVG hex pattern content - theme pink stroke outline and transparent background
const hexSvgContent = `<svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="1280" height="886" viewBox="0 0 1280 886" preserveAspectRatio="xMidYMid meet"><g transform="translate(0,886) scale(0.1,-0.1)" fill="none" stroke="#FF6E7F" stroke-width="30"><path d="M6400 8613 c-79 -137 -150 -256 -158 -265 -14 -16 -41 -18 -308 -18 l-292 0 -147 -252 c-82 -139 -153 -256 -159 -260 -6 -4 -139 -8 -296 -8 l-285 0 -148 -255 c-122 -208 -153 -256 -175 -262 -27 -7 -540 5 -553 13 -4 2 -67 109 -140 237 -73 127 -139 240 -147 250 -14 15 -41 17 -301 17 -157 0 -291 4 -297 8 -6 4 -66 104 -134 222 -67 118 -133 232 -146 253 l-24 37 -302 -2 -301 -3 -142 -245 c-79 -135 -148 -251 -154 -257 -9 -10 -83 -13 -304 -13 l-293 0 -152 -261 -152 -260 141 -247 c78 -136 149 -255 157 -264 14 -16 41 -18 302 -18 261 0 288 -2 302 -17 34 -39 288 -498 283 -511 -3 -8 -69 -124 -147 -258 l-142 -244 -290 -2 -290 -3 -141 -241 c-77 -133 -146 -248 -154 -258 -12 -14 -46 -16 -306 -16 l-293 0 -138 -237 c-75 -131 -145 -250 -155 -264 -13 -19 -15 -29 -7 -37 6 -6 75 -122 153 -259 l143 -248 298 -5 299 -5 142 -245 c78 -135 142 -251 142 -258 1 -7 -62 -121 -140 -253 -77 -132 -143 -247 -146 -255 -3 -8 59 -127 143 -274 l148 -260 291 0 c266 0 293 -2 307 -17 25 -29 288 -491 288 -506 0 -8 -65 -126 -145 -263 -80 -137 -143 -253 -141 -259 2 -5 69 -122 148 -260 l144 -250 296 -5 c163 -3 299 -8 303 -12 4 -3 71 -118 149 -255 l142 -248 306 -3 306 -2 144 246 c78 136 152 252 163 260 16 11 75 12 296 7 l276 -6 145 -251 144 -251 299 -5 299 -5 146 -255 146 -255 44 -7 c25 -3 160 -7 302 -7 l256 -1 132 227 c73 126 143 245 156 265 l24 38 296 2 297 3 141 241 c77 133 147 249 155 258 12 15 44 16 294 14 l281 -3 147 -255 146 -255 299 -5 299 -5 132 -230 c72 -126 141 -245 152 -262 l21 -33 299 0 c277 0 300 1 305 18 4 9 70 127 149 262 l143 245 300 5 299 5 147 250 c81 138 147 255 147 261 1 11 -273 499 -291 519 -5 6 -127 12 -306 15 l-296 5 -133 230 c-73 127 -140 244 -149 261 l-17 31 143 244 c78 134 147 247 154 251 6 4 142 8 301 8 l290 0 134 233 c74 127 143 244 153 260 l19 27 292 0 292 0 149 255 c119 206 153 256 174 262 13 3 145 3 291 -1 250 -7 268 -6 282 11 9 10 78 125 154 256 75 130 141 240 145 242 5 3 -7 31 -26 63 -19 31 -87 149 -151 262 l-118 205 -297 5 c-163 3 -300 8 -303 12 -4 4 -71 119 -149 255 l-142 248 -306 3 -306 2 -143 -247 c-79 -135 -150 -252 -157 -260 -15 -14 -213 -16 -457 -4 l-130 6 -146 255 -147 255 -298 5 -299 5 -118 205 c-180 311 -169 287 -150 324 38 74 267 462 277 468 6 4 147 8 313 8 l301 0 152 259 151 260 -147 258 c-81 142 -148 259 -148 260 -1 1 -136 5 -302 9 l-301 7 -20 -29 c-11 -16 -80 -131 -152 -256 l-133 -228 -298 0 -299 0 -19 28 c-10 15 -78 131 -151 259 -120 211 -131 234 -120 255 7 13 67 118 135 233 67 116 128 223 135 238 11 25 3 42 -137 287 l-149 260 -290 0 c-159 0 -295 4 -301 8 -6 4 -77 123 -158 265 l-148 257 -297 0 -298 0 -143 -247z"/></g></svg>`

export function HiveShimmer({ className }: HiveShimmerProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center h-[calc(100vh-312px)] w-full relative overflow-hidden',
        className,
      )}
      role="status"
      aria-label="Loading visualization"
    >
      <style>{`
        @keyframes fadeInOut {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 1;
          }
        }
        .hex-pattern {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: calc(100% - 4rem);
          height: calc(100% - 4rem);
          animation: fadeInOut 2s ease-in-out infinite;
        }
        .hex-pattern svg {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
      `}</style>

      <div className="relative w-full h-full flex items-center justify-center p-8">
        {/* Hex pattern background - single SVG with fade animation */}
        <div className="hex-pattern" dangerouslySetInnerHTML={{ __html: hexSvgContent }} />

        {/* Loading text */}
        <div className="relative z-10 text-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">Computing positions...</div>
        </div>
      </div>
    </div>
  )
}
