
import React, { useCallback } from 'react';
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
 */
export const ProjectField: React.FC<ProjectFieldProps> = (props) => {
  const { state, setAnswer, setValidationErrors } = useProject();
  const { field, error, ...rest } = props;
  const contextError = state.validationErrors?.[field];
  const value = state.answers[field] || '';
  const errorMessage = error || contextError;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const val = e.target.value;
    setAnswer(field, val);

    // Real-time validation logic
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
        // If we found an error, update it immediately
        if (contextError !== err) {
             setValidationErrors({ ...currentErrors, [field]: err });
        }
    } else {
        // If valid, and there was an error, clear it
        if (contextError) {
             const newErrors = { ...currentErrors };
             delete newErrors[field];
             setValidationErrors(newErrors);
        }
    }
  };

  const handleBlur = () => {
    const currentValue = state.answers[field] || '';
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
          value={value}
          error={errorMessage}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      );
    case 'input':
      return (
        <Input
          {...rest}
          value={value}
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
          value={value}
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
