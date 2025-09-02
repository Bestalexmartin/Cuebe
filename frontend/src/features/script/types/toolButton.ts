// frontend/src/features/script/types/toolButton.ts

export interface ToolButton {
    id: string;
    icon: 'view' | 'play' | 'pause-fill' | 'pause-light' | 'info' | 'script-edit' | 'share' | 'dashboard' | 'add' | 'copy' | 'group' | 'ungroup' | 'delete' | 'element-edit' | 'jump-top' | 'jump-bottom' | 'history' | 'exit' | 'stop';
    label: string;
    description: string;
    isActive: boolean;
    isDisabled?: boolean;
    isFlashing?: boolean;
}
