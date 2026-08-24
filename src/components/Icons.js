import React from 'react';
import Svg, {
  Path,
  Circle,
  Line,
  Polygon,
  Polyline,
  Rect,
} from 'react-native-svg';

const base = (size, color) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: color,
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
});

export const IconSettings = ({ size = 20, color = '#f4f4f5' }) => (
  <Svg {...base(size, color)}>
    <Circle cx="12" cy="12" r="3" />
    <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Svg>
);

export const IconSend = ({ size = 20, color = '#ffffff' }) => (
  <Svg {...base(size, color)}>
    <Line x1="22" y1="2" x2="11" y2="13" />
    <Polygon points="22 2 15 22 11 13 2 9 22 2" />
  </Svg>
);

export const IconTrash = ({ size = 16, color = '#fb7185' }) => (
  <Svg {...base(size, color)}>
    <Polyline points="3 6 5 6 21 6" />
    <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </Svg>
);

export const IconBot = ({ size = 20, color = '#ffffff' }) => (
  <Svg {...base(size, color)}>
    <Path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    <Circle cx="12" cy="12" r="4" />
  </Svg>
);

export const IconUser = ({ size = 20, color = '#a1a1aa' }) => (
  <Svg {...base(size, color)}>
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <Circle cx="12" cy="7" r="4" />
  </Svg>
);

export const IconKey = ({ size = 16, color = '#a1a1aa' }) => (
  <Svg {...base(size, color)}>
    <Path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </Svg>
);

export const IconAlert = ({ size = 20, color = '#ffffff' }) => (
  <Svg {...base(size, color)}>
    <Circle cx="12" cy="12" r="10" />
    <Line x1="12" y1="8" x2="12" y2="12" />
    <Line x1="12" y1="16" x2="12.01" y2="16" />
  </Svg>
);

export const IconClose = ({ size = 20, color = '#a1a1aa' }) => (
  <Svg {...base(size, color)}>
    <Line x1="18" y1="6" x2="6" y2="18" />
    <Line x1="6" y1="6" x2="18" y2="18" />
  </Svg>
);

export const IconCopy = ({ size = 16, color = '#71717a' }) => (
  <Svg {...base(size, color)}>
    <Rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Svg>
);

export const IconCheck = ({ size = 16, color = '#10b981' }) => (
  <Svg {...base(size, color)}>
    <Polyline points="20 6 9 17 4 12" />
  </Svg>
);

export const IconDownload = ({ size = 16, color = '#f4f4f5' }) => (
  <Svg {...base(size, color)}>
    <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <Polyline points="7 10 12 15 17 10" />
    <Line x1="12" y1="15" x2="12" y2="3" />
  </Svg>
);

export const IconStop = ({ size = 16, color = '#fb7185' }) => (
  <Svg {...base(size, color)}>
    <Rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
  </Svg>
);

export const IconServer = ({ size = 16, color = '#a1a1aa' }) => (
  <Svg {...base(size, color)}>
    <Rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
    <Rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
    <Line x1="6" y1="6" x2="6.01" y2="6" />
    <Line x1="6" y1="18" x2="6.01" y2="18" />
  </Svg>
);

export const IconRefresh = ({ size = 16, color = '#22d3ee' }) => (
  <Svg {...base(size, color)}>
    <Path d="M21 2v6h-6" />
    <Path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <Path d="M3 22v-6h6" />
    <Path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
  </Svg>
);

export const IconUpload = ({ size = 20, color = '#ffffff' }) => (
  <Svg {...base(size, color)}>
    <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <Polyline points="17 8 12 3 7 8" />
    <Line x1="12" y1="3" x2="12" y2="15" />
  </Svg>
);

export const IconPlus = ({ size = 20, color = '#ffffff' }) => (
  <Svg {...base(size, color)}>
    <Line x1="12" y1="5" x2="12" y2="19" />
    <Line x1="5" y1="12" x2="19" y2="12" />
  </Svg>
);

export const IconMic = ({ size = 20, color = '#ffffff' }) => (
  <Svg {...base(size, color)}>
    <Rect x="9" y="2" width="6" height="12" rx="3" ry="3" />
    <Path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8" />
  </Svg>
);

export const IconChat = ({ size = 20, color = '#ffffff' }) => (
  <Svg {...base(size, color)}>
    <Path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9.5 9.5 0 0 1-4-.9L3 21l1.9-4.4A8.2 8.2 0 0 1 3 11.5a8.4 8.4 0 0 1 9-8.5 8.4 8.4 0 0 1 9 8.5z" />
  </Svg>
);

export const IconEdit = ({ size = 16, color = '#ffffff' }) => (
  <Svg {...base(size, color)}>
    <Path d="M12 20h9" />
    <Path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Svg>
);

export const IconDocument = ({ size = 20, color = '#f4f4f5' }) => (<Svg {...base(size, color)}><Path d="M6 2h9l4 4v16H6z"/><Polyline points="15 2 15 7 20 7"/><Line x1="9" y1="12" x2="16" y2="12"/><Line x1="9" y1="16" x2="16" y2="16"/></Svg>);
export const IconWorkspace = ({ size = 20, color = '#f4f4f5' }) => (<Svg {...base(size, color)}><Rect x="3" y="4" width="18" height="16" rx="2"/><Line x1="3" y1="9" x2="21" y2="9"/><Line x1="9" y1="9" x2="9" y2="20"/></Svg>);
export const IconMore = ({ size = 20, color = '#f4f4f5' }) => (<Svg {...base(size, color)}><Circle cx="5" cy="12" r="1"/><Circle cx="12" cy="12" r="1"/><Circle cx="19" cy="12" r="1"/></Svg>);
export const IconChevronUp = ({ size = 18, color = '#f4f4f5' }) => (<Svg {...base(size, color)}><Polyline points="18 15 12 9 6 15"/></Svg>);
export const IconChevronDown = ({ size = 18, color = '#f4f4f5' }) => (<Svg {...base(size, color)}><Polyline points="6 9 12 15 18 9"/></Svg>);
export const IconUndo = ({ size = 18, color = '#f4f4f5' }) => (<Svg {...base(size, color)}><Polyline points="9 14 4 9 9 4"/><Path d="M4 9h9a7 7 0 0 1 7 7"/></Svg>);
export const IconRedo = ({ size = 18, color = '#f4f4f5' }) => (<Svg {...base(size, color)}><Polyline points="15 14 20 9 15 4"/><Path d="M20 9h-9a7 7 0 0 0-7 7"/></Svg>);
export const IconSearch = ({ size = 18, color = '#f4f4f5' }) => (<Svg {...base(size, color)}><Circle cx="11" cy="11" r="7"/><Line x1="20" y1="20" x2="16.65" y2="16.65"/></Svg>);
export const IconCamera = ({ size = 20, color = '#f4f4f5' }) => (<Svg {...base(size, color)}><Path d="M3 7h4l2-3h6l2 3h4v13H3z"/><Circle cx="12" cy="13" r="4"/></Svg>);
export const IconGallery = ({ size = 20, color = '#f4f4f5' }) => (<Svg {...base(size, color)}><Rect x="3" y="3" width="18" height="18" rx="2"/><Circle cx="8.5" cy="8.5" r="1.5"/><Polyline points="21 15 16 10 5 21"/></Svg>);
