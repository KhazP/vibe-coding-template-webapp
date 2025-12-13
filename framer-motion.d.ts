// Type augmentation for framer-motion to fix missing HTML attributes on motion components
import 'framer-motion';

declare module 'framer-motion' {
    export interface MotionProps {
        className?: string;
        onClick?: React.MouseEventHandler<HTMLElement>;
        onMouseEnter?: React.MouseEventHandler<HTMLElement>;
        onMouseLeave?: React.MouseEventHandler<HTMLElement>;
        onFocus?: React.FocusEventHandler<HTMLElement>;
        onBlur?: React.FocusEventHandler<HTMLElement>;
        style?: React.CSSProperties;
        id?: string;
        'aria-label'?: string;
        'aria-hidden'?: boolean | 'true' | 'false';
        ref?: React.Ref<HTMLElement>;
    }
}
