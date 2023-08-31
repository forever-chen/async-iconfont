export interface Icon {
  id: string;
  name: string;
  svgContent: string;
  code: string;
}

export interface EventData {
  page: any;
  searchValue: any;
  active: 'local' | 'project' | 'favorite' | 'antd',
  icon: {
    id: string;
    svg: string;
    style: string;
  }
}

export interface EventMessage {
  type: string;
  data: EventData;
}
export interface ConfigType{
  projectName: string;
  transionMethod: string;
  transionSvgDir: string;
  transionSymbolJsDir: string;
  symbolJsWiteTemplateDir: string;
  active?:boolean
}