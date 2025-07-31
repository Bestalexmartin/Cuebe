// frontend/src/features/script/types/tool-button.ts

export interface ToolButton {
    id: string;
    icon: 'view' | 'play' | 'info' | 'script-edit' | 'share' | 'dashboard' | 'add' | 'copy' | 'group' | 'delete' | 'element-edit' | 'jump-top' | 'jump-bottom' | 'history' | 'exit';
    label: string;
    description: string;
    isActive: boolean;
    isDisabled?: boolean;
}
