export const ResponsiveMode=Object.freeze({COMPACT:'COMPACT',MEDIUM:'MEDIUM',EXPANDED:'EXPANDED'});
export const classifyResponsiveMode=(width)=>Number(width)>=1000?ResponsiveMode.EXPANDED:Number(width)>=700?ResponsiveMode.MEDIUM:ResponsiveMode.COMPACT;
export const BACK_RESOLUTION_ORDER=Object.freeze(['CONTEXT_MENU','BOTTOM_SHEET','DIALOG','NESTED_VIEW','PREVIOUS_DESTINATION','OS_EXIT']);
export const resolveBackAction=(state={})=>BACK_RESOLUTION_ORDER.find(key=>key==='OS_EXIT'||Boolean(state[key]))||'OS_EXIT';
export const classifyLayout=(width)=>classifyResponsiveMode(width).toLowerCase();
export const backResolutionOrder=BACK_RESOLUTION_ORDER;
