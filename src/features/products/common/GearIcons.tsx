import React from 'react'
import Svg, { Path, Circle, Line, G } from 'react-native-svg'

export interface GearIconProps {
	size?: number
	color?: string
}

export const DrinaIcon: React.FC<GearIconProps> = ({ size = 24, color = '#000000' }) => (
	<Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
		{/* Handle at the top */}
		<Path d="M38,25 C38,10 62,10 62,25" stroke={color} strokeWidth="4.5" strokeLinecap="round" fill="none" />
		{/* Cylinder body outline */}
		<Path d="M30,24 Q65,24 82,37 M30,76 Q65,76 82,63 M82,37 A13,13 0 0,1 82,63" stroke={color} strokeWidth="4.5" strokeLinecap="round" fill="none" />
		{/* Left circular opening outer boundary */}
		<Path d="M30,24 A13,26 0 0,0 30,76 A13,26 0 0,0 30,24 Z" stroke={color} strokeWidth="4.5" fill="none" />
		{/* Inner funnel entrance */}
		<Path d="M21,50 A6.5,11 0 0,0 32,50 A6.5,11 0 0,0 21,50 Z" stroke={color} strokeWidth="3.5" fill="none" />
		{/* Connecting lines for funnel depth */}
		<Line x1="17.5" y1="28" x2="20.5" y2="40" stroke={color} strokeWidth="3" strokeLinecap="round" />
		<Line x1="17.5" y1="72" x2="20.5" y2="60" stroke={color} strokeWidth="3" strokeLinecap="round" />

		{/* Ribs (vertical loops representing cylinder bands) */}
		<Path d="M47,25 A11,25 0 0,1 47,75" stroke={color} strokeWidth="3" fill="none" />
		<Path d="M64,27 A9,23 0 0,1 64,73" stroke={color} strokeWidth="3" fill="none" />

		{/* Woven check-lines */}
		<Path d="M30,34 Q65,36 80,43" stroke={color} strokeWidth="2.5" strokeDasharray="4 4" fill="none" />
		<Path d="M30,44 Q65,46 82,50" stroke={color} strokeWidth="2.5" strokeDasharray="4 4" fill="none" />
		<Path d="M30,56 Q65,58 82,56" stroke={color} strokeWidth="2.5" strokeDasharray="4 4" fill="none" />
		<Path d="M30,66 Q65,64 80,59" stroke={color} strokeWidth="2.5" strokeDasharray="4 4" fill="none" />
	</Svg>
)

export const GhzalIcon: React.FC<GearIconProps> = ({ size = 24, color = '#000000' }) => (
	<Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
		{/* Vertical side cords */}
		<Line x1="22" y1="14" x2="22" y2="86" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
		<Line x1="78" y1="14" x2="78" y2="86" stroke={color} strokeWidth="4.5" strokeLinecap="round" />

		{/* Curved top net line */}
		<Path d="M22,20 C36,25 64,25 78,20" stroke={color} strokeWidth="3.5" fill="none" strokeLinecap="round" />

		{/* Honeycomb/Diamond Net Mesh grid lines */}
		{/* Diagonals Left-to-Right */}
		<Line x1="22" y1="30" x2="78" y2="52" stroke={color} strokeWidth="1.8" opacity="0.65" />
		<Line x1="22" y1="46" x2="78" y2="68" stroke={color} strokeWidth="1.8" opacity="0.65" />
		<Line x1="22" y1="62" x2="78" y2="84" stroke={color} strokeWidth="1.8" opacity="0.65" />
		{/* Diagonals Right-to-Left */}
		<Line x1="78" y1="30" x2="22" y2="52" stroke={color} strokeWidth="1.8" opacity="0.65" />
		<Line x1="78" y1="46" x2="22" y2="68" stroke={color} strokeWidth="1.8" opacity="0.65" />
		<Line x1="78" y1="62" x2="22" y2="84" stroke={color} strokeWidth="1.8" opacity="0.65" />

		{/* Corks/Floats on the left and right borders */}
		{[24, 38, 52, 66, 80].map((y) => (
			<React.Fragment key={y}>
				<Circle cx="22" cy={y} r="4.5" fill={color} />
				<Circle cx="78" cy={y} r="4.5" fill={color} />
			</React.Fragment>
		))}

		{/* Bottom sinkers / lead line weights */}
		{[32, 44, 56, 68].map((x) => (
			<Circle key={x} cx={x} cy="83" r="3" fill={color} />
		))}

		{/* Central Fish silhouette (Centered at 50, 50) */}
		<G transform="translate(30, 37) scale(0.8)">
			{/* Fish outline */}
			<Path
				d="M0,16 C10,5 30,5 40,16 C45,21 51,23 56,21 C53,26 53,31 56,36 C51,34 45,36 40,41 C30,52 10,52 0,41 C-5,36 -5,21 0,16 Z"
				fill="#ffffff"
				stroke={color}
				strokeWidth="3"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			{/* Tail fin */}
			<Path d="M0,16 L-13,9 L-9,28.5 L-13,48 L0,41 Z" fill="#ffffff" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
			{/* Eye */}
			<Circle cx="35" cy="23" r="3" fill={color} />
		</G>
	</Svg>
)

export const GearIcon: React.FC<{ type: 'trap' | 'gillnet'; size?: number; color?: string }> = ({ type, size = 24, color = '#000000' }) => {
	if (type === 'trap') {
		return <DrinaIcon size={size} color={color} />
	}
	return <GhzalIcon size={size} color={color} />
}
