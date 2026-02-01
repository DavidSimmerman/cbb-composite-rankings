export default function Loading() {
	return (
		<div className="flex min-h-screen items-center justify-center gap-2">
			<svg
				viewBox="0 0 339 124"
				className="w-24 h-12 text-white -skew-x-12"
				fill="none"
				stroke="currentColor"
				strokeWidth="3.5"
			>
				<line x1="0" y1="2" x2="105" y2="2" pathLength="1" className="bracket-line bracket-d0" />
				<line x1="0" y1="42" x2="105" y2="42" pathLength="1" className="bracket-line bracket-d0" />
				<line x1="105" y1="2" x2="105" y2="22" pathLength="1" className="bracket-line bracket-d1" />
				<line x1="105" y1="42" x2="105" y2="22" pathLength="1" className="bracket-line bracket-d1" />
				<line x1="105" y1="22" x2="210" y2="22" pathLength="1" className="bracket-line bracket-d2" />
				<line x1="0" y1="82" x2="105" y2="82" pathLength="1" className="bracket-line bracket-d0" />
				<line x1="0" y1="122" x2="105" y2="122" pathLength="1" className="bracket-line bracket-d0" />
				<line x1="105" y1="82" x2="105" y2="102" pathLength="1" className="bracket-line bracket-d1" />
				<line x1="105" y1="122" x2="105" y2="102" pathLength="1" className="bracket-line bracket-d1" />
				<line x1="105" y1="102" x2="210" y2="102" pathLength="1" className="bracket-line bracket-d2" />
				<line x1="210" y1="22" x2="210" y2="62" pathLength="1" className="bracket-line bracket-d3" />
				<line x1="210" y1="102" x2="210" y2="62" pathLength="1" className="bracket-line bracket-d3" />
				<line x1="210" y1="62" x2="337" y2="62" pathLength="1" className="bracket-line bracket-d4" />
			</svg>

			<div className="relative flex h-36 w-36 items-center justify-center shrink-0">
				<div className="absolute inset-6.5 animate-spin rounded-full border-2 border-transparent border-t-white border-r-white border-b-white" />

				<svg viewBox="0 0 794 632" className="h-28 w-28" fill="white" preserveAspectRatio="xMidYMid meet">
					<g transform="translate(0.000000,632.000000) scale(0.100000,-0.100000)">
						<path d="M3740 5999 c-387 -31 -798 -155 -1135 -340 -774 -427 -1304 -1175 -1445 -2040 -72 -440 -36 -900 102 -1329 353 -1094 1316 -1859 2469 -1961 165 -14 483 -6 629 16 343 53 695 170 976 326 440 245 785 572 1049 998 298 480 439 1007 422 1581 -19 631 -231 1205 -632 1703 -580 721 -1509 1120 -2435 1046z m575 -174 c221 -29 419 -81 642 -167 101 -39 102 -40 108 -76 33 -202 118 -448 237 -686 38 -76 68 -139 66 -141 -2 -2 -51 -13 -109 -24 -58 -12 -148 -33 -198 -46 -51 -14 -94 -25 -95 -25 -2 0 -27 34 -56 76 -285 412 -733 849 -1085 1057 l-70 42 50 7 c80 10 379 1 510 -17z m-781 -52 c362 -160 853 -594 1195 -1056 41 -54 69 -102 65 -107 -5 -4 -49 -22 -99 -40 -49 -18 -163 -64 -253 -102 l-163 -70 -99 101 c-240 243 -530 403 -882 485 -186 44 -260 51 -528 51 -199 -1 -276 -5 -350 -18 -149 -28 -306 -71 -419 -116 -57 -23 -106 -40 -107 -38 -8 8 183 210 280 296 226 200 421 328 686 450 163 76 511 188 589 190 13 1 51 -11 85 -26z m1775 -285 c243 -137 523 -372 707 -593 46 -55 84 -102 84 -105 0 -3 -127 -5 -282 -4 l-282 1 -72 139 c-84 159 -160 346 -198 484 -14 52 -26 98 -26 103 0 12 10 8 69 -25z m-2237 -624 c301 -37 596 -152 818 -319 100 -75 230 -195 230 -213 0 -6 -28 -26 -62 -43 -35 -17 -124 -65 -198 -107 -914 -509 -1755 -1236 -2278 -1970 l-81 -113 -20 46 c-65 148 -144 442 -170 640 -21 154 -25 218 -24 395 2 438 91 808 293 1210 69 138 70 140 141 189 135 95 361 197 537 242 255 65 520 79 814 43z m3098 -258 c79 -18 85 -25 173 -194 154 -298 248 -601 291 -937 14 -109 22 -355 12 -355 -3 0 -21 31 -41 69 -82 164 -243 412 -440 681 -274 374 -525 735 -525 754 0 19 434 4 530 -18z m-651 -90 c65 -107 241 -358 451 -646 405 -555 554 -811 625 -1075 l22 -80 -23 -110 c-85 -402 -270 -794 -526 -1114 -83 -104 -311 -337 -316 -322 -2 6 4 45 12 88 47 232 68 650 47 930 -59 784 -276 1508 -645 2148 -57 99 -101 183 -97 186 6 7 194 51 286 68 109 19 107 20 164 -73z m-576 -113 c75 -118 137 -231 228 -416 241 -489 395 -1020 466 -1607 25 -205 25 -731 0 -914 -21 -154 -58 -328 -89 -422 -23 -68 -24 -70 -108 -126 -309 -206 -710 -356 -1105 -415 -208 -31 -763 -20 -797 15 -3 4 31 54 77 111 391 484 749 1208 920 1856 101 386 138 770 100 1059 -30 225 -83 390 -196 605 -33 63 -56 118 -52 122 20 18 465 195 501 198 6 1 31 -29 55 -66z m-649 -319 c202 -362 248 -774 145 -1300 -121 -621 -433 -1343 -811 -1877 -63 -88 -167 -221 -255 -325 l-28 -32 -122 34 c-673 193 -1274 670 -1607 1277 l-36 66 99 149 c372 556 1049 1194 1781 1679 254 168 720 435 760 435 9 0 40 -44 74 -106z" />
					</g>
				</svg>
			</div>

			<svg
				viewBox="21 0 339 124"
				className="w-24 h-12 text-white -skew-x-12"
				fill="none"
				stroke="currentColor"
				strokeWidth="3.5"
			>
				<line x1="360" y1="2" x2="255" y2="2" pathLength="1" className="bracket-line bracket-d0" />
				<line x1="360" y1="42" x2="255" y2="42" pathLength="1" className="bracket-line bracket-d0" />
				<line x1="255" y1="2" x2="255" y2="22" pathLength="1" className="bracket-line bracket-d1" />
				<line x1="255" y1="42" x2="255" y2="22" pathLength="1" className="bracket-line bracket-d1" />
				<line x1="255" y1="22" x2="150" y2="22" pathLength="1" className="bracket-line bracket-d2" />
				<line x1="360" y1="82" x2="255" y2="82" pathLength="1" className="bracket-line bracket-d0" />
				<line x1="360" y1="122" x2="255" y2="122" pathLength="1" className="bracket-line bracket-d0" />
				<line x1="255" y1="82" x2="255" y2="102" pathLength="1" className="bracket-line bracket-d1" />
				<line x1="255" y1="122" x2="255" y2="102" pathLength="1" className="bracket-line bracket-d1" />
				<line x1="255" y1="102" x2="150" y2="102" pathLength="1" className="bracket-line bracket-d2" />
				<line x1="150" y1="22" x2="150" y2="62" pathLength="1" className="bracket-line bracket-d3" />
				<line x1="150" y1="102" x2="150" y2="62" pathLength="1" className="bracket-line bracket-d3" />
				<line x1="150" y1="62" x2="23" y2="62" pathLength="1" className="bracket-line bracket-d4" />
			</svg>
		</div>
	);
}
