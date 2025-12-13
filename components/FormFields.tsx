import React, { useState, useEffect, useRef } from 'react';
import { useProject } from '../context/ProjectContext';
import { Input, TextArea, Select } from './UI';
import { ProjectFieldKey } from '../types';

interface Option {
  value: string;
  label: string;
}

interface BaseFieldProps {
  field: ProjectFieldKey;
  label: string;
  placeholder?: string;
  tooltip?: string;
  required?: boolean;
  error?: string;
  className?: string;
  rightLabel?: React.ReactNode;
}

type TextAreaType = BaseFieldProps & {
  type: 'textarea';
  maxLength?: number;
};

type InputType = BaseFieldProps & {
  type: 'input';
  maxLength?: number;
};

type SelectType = BaseFieldProps & {
  type: 'select';
  options: Option[];
};

export type ProjectFieldProps = TextAreaType | InputType | SelectType;

/**
 * A unified form field component that strictly requires a valid ProjectFieldKey.
 * Uses discriminated unions for 'type' prop (textarea, input, select).
 * 
 * Performance Optimization: Uses local state and debounced global updates to prevent 
 * rapid re-renders of the entire app context on every keystroke.
 */
export const ProjectField: React.FC<ProjectFieldProps> = (props) => {
  const { state, setAnswer, setValidationErrors } = useProject();
  const { field, error, ...rest } = props;
  
  const contextValue = state.answers[field] || '';
  const contextError = state.validationErrors?.[field];
  const errorMessage = error || contextError;

  // Local state for immediate UI feedback
  const [localValue, setLocalValue] = useState(contextValue);
  
  // Ref to track debounce timeout
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync with global state changes (e.g., undo/redo, import)
  // We only update if the context value is different from our local value 
  // and we assume the context is the source of truth when it changes externally.
  useEffect(() => {
    if (contextValue !== localValue) {
        setLocalValue(contextValue);
    }
  }, [contextValue]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const val = e.target.value;
    setLocalValue(val);

    // Clear existing timeout
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Debounce the expensive context update
    timeoutRef.current = setTimeout(() => {
        setAnswer(field, val);

        // Validation Logic (Executed after debounce)
        let err = '';
        
        // Check required
        if (props.required && !val.trim()) {
            err = 'This field is required.';
        }
        
        // Check Max Length
        if ((props.type === 'textarea' || props.type === 'input') && (props as any).maxLength) {
            const limit = (props as any).maxLength;
            if (val.length > limit) {
                err = `Max length is ${limit} characters.`;
            }
        }

        const currentErrors = state.validationErrors || {};
        
        if (err) {
            if (contextError !== err) {
                setValidationErrors({ ...currentErrors, [field]: err });
            }
        } else {
            if (contextError) {
                const newErrors = { ...currentErrors };
                delete newErrors[field];
                setValidationErrors(newErrors);
            }
        }
    }, 300); // 300ms debounce
  };

  const handleBlur = () => {
    // Flush pending updates immediately on blur
    if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        setAnswer(field, localValue);
    }

    const currentValue = localValue;
    let err = '';

    if (props.required && !currentValue.trim()) {
      err = 'This field is required.';
    }
    
    // Check max length
    if (props.type === 'textarea' || props.type === 'input') {
        const limit = (props as any).maxLength;
        if (limit && currentValue.length > limit) {
             err = `Max length is ${limit} characters.`;
        }
    }

    const currentErrors = state.validationErrors || {};
    
    if (err) {
      setValidationErrors({ ...currentErrors, [field]: err });
    } else if (currentErrors[field]) {
      // Clear error if now valid
      const newErrors = { ...currentErrors };
      delete newErrors[field];
      setValidationErrors(newErrors);
    }
  };

  switch (props.type) {
    case 'textarea':
      return (
        <TextArea
          {...rest}
          value={localValue}
          error={errorMessage}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      );
    case 'input':
      return (
        <Input
          {...rest}
          value={localValue}
          error={errorMessage}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      );
    case 'select':
      const { options, ...selectRest } = props;
      return (
        <Select
          {...selectRest}
          value={localValue}
          error={errorMessage}
          onChange={handleChange}
          onBlur={handleBlur}
        >
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      );
    default:
      return null;
  }
};

/**
 * Typed Wrapper for Input
 */
export const ProjectInput: React.FC<Omit<InputType, 'type'>> = (props) => (
  <ProjectField type="input" {...props} />
);

/**
 * Typed Wrapper for TextArea
 */
export const ProjectTextArea: React.FC<Omit<TextAreaType, 'type'>> = (props) => (
  <ProjectField type="textarea" {...props} />
);

/**
 * Typed Wrapper for Select
 */
export const ProjectSelect: React.FC<Omit<SelectType, 'type'>> = (props) => (
  <ProjectField type="select" {...props} />
);