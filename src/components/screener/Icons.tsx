import React from 'react';

interface IconProps {
  size?: number;
  stroke?: number;
  fill?: string;
  className?: string;
  style?: React.CSSProperties;
  d?: React.ReactNode | string;
}

const Icon = ({ d, size = 14, stroke = 1.5, fill = "none", ...p }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...p}>
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);

export const IcSearch = (p: IconProps) => <Icon size={13} d={<><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>} {...p}/>;
export const IcChev   = (p: IconProps) => <Icon d="M6 9l6 6 6-6" {...p}/>;
export const IcX      = (p: IconProps) => <Icon d="M6 6l12 12M6 18L18 6" {...p}/>;
export const IcShare  = (p: IconProps) => <Icon d={<><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5L15.4 17.5M15.4 6.5L8.6 10.5"/></>} {...p}/>;
export const IcDownload = (p: IconProps) => <Icon d={<><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 21h16"/></>} {...p}/>;
export const IcSun    = (p: IconProps) => <Icon d={<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>} {...p}/>;
export const IcMoon   = (p: IconProps) => <Icon d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" {...p}/>;
export const IcPanel  = (p: IconProps) => <Icon d={<><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></>} {...p}/>;
export const IcColumns = (p: IconProps) => <Icon d={<><rect x="3" y="4" width="18" height="16" rx="1"/><path d="M9 4v16M15 4v16"/></>} {...p}/>;
export const IcReset  = (p: IconProps) => <Icon d={<><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></>} {...p}/>;

// filter group icons
export const IcBasics = (p: IconProps) => <Icon d={<><path d="M4 6h16M4 12h16M4 18h10"/></>} className="gicon" {...p}/>;
export const IcReturn = (p: IconProps) => <Icon d={<><path d="M3 17l6-6 4 4 8-9"/><path d="M14 6h7v7"/></>} className="gicon" {...p}/>;
export const IcDraw   = (p: IconProps) => <Icon d={<><path d="M3 8l5 8 4-4 4 6 5-10"/></>} className="gicon" {...p}/>;
export const IcMgr    = (p: IconProps) => <Icon d={<><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></>} className="gicon" {...p}/>;
export const IcStyle  = (p: IconProps) => <Icon d={<><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/></>} className="gicon" {...p}/>;
export const IcConc   = (p: IconProps) => <Icon d={<><rect x="3" y="10" width="4" height="11"/><rect x="10" y="5" width="4" height="16"/><rect x="17" y="13" width="4" height="8"/></>} className="gicon" {...p}/>;
