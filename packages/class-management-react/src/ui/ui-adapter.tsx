/* eslint-disable react-refresh/only-export-components */
import { createContext, forwardRef, useContext, type ComponentPropsWithoutRef, type ComponentType, type ElementRef, type ReactNode } from "react";
import { cn } from "./classnames";

export type ButtonProps = ComponentPropsWithoutRef<"button"> & {
	variant?: "default" | "outline" | "ghost";
	size?: "default" | "sm" | "icon";
};

export type InputProps = ComponentPropsWithoutRef<"input">;
export type TextareaProps = ComponentPropsWithoutRef<"textarea">;
export type LabelProps = ComponentPropsWithoutRef<"label">;

export type ClassManagementUiAdapter = {
	Button: ComponentType<ButtonProps>;
	Input: ComponentType<InputProps>;
	Textarea: ComponentType<TextareaProps>;
	Label: ComponentType<LabelProps>;
};

const DefaultButton = forwardRef<ElementRef<"button">, ButtonProps>(({ className, variant = "default", size = "default", ...props }, ref) => (
	<button
		ref={ref}
		className={cn(
			"inline-flex items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
			variant === "default" && "bg-primary text-primary-foreground",
			variant === "outline" && "bg-background text-foreground",
			variant === "ghost" && "border-transparent bg-transparent text-foreground",
			size === "sm" && "px-3 py-1.5 text-xs",
			size === "icon" && "size-9 p-0",
			className,
		)}
		{...props}
	/>
));
DefaultButton.displayName = "DefaultButton";

const DefaultInput = forwardRef<ElementRef<"input">, InputProps>(({ className, ...props }, ref) => (
	<input ref={ref} className={cn("h-10 rounded-md border border-input bg-background px-3 py-2 text-sm", className)} {...props} />
));
DefaultInput.displayName = "DefaultInput";

const DefaultTextarea = forwardRef<ElementRef<"textarea">, TextareaProps>(({ className, ...props }, ref) => (
	<textarea ref={ref} className={cn("min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm", className)} {...props} />
));
DefaultTextarea.displayName = "DefaultTextarea";

const DefaultLabel = forwardRef<ElementRef<"label">, LabelProps>(({ className, ...props }, ref) => (
	<label ref={ref} className={cn("text-sm font-medium", className)} {...props} />
));
DefaultLabel.displayName = "DefaultLabel";

export const defaultClassManagementUiAdapter: ClassManagementUiAdapter = {
	Button: DefaultButton,
	Input: DefaultInput,
	Textarea: DefaultTextarea,
	Label: DefaultLabel,
};

const ClassManagementUiContext = createContext<ClassManagementUiAdapter>(defaultClassManagementUiAdapter);

export function ClassManagementUiProvider({ adapter, children }: { adapter?: Partial<ClassManagementUiAdapter>; children: ReactNode }) {
	return <ClassManagementUiContext.Provider value={{ ...defaultClassManagementUiAdapter, ...adapter }}>{children}</ClassManagementUiContext.Provider>;
}

export function useClassManagementUi() {
	return useContext(ClassManagementUiContext);
}
