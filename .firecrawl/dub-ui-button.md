import { cn } from "@dub/utils";
import { VariantProps, cva } from "class-variance-authority";
import { ReactNode, forwardRef } from "react";
import { LoadingSpinner } from "./icons";
import { Tooltip } from "./tooltip";

export const buttonVariants = cva("transition-all", {
 variants: {
 variant: {
 primary:
 "border-black bg-black dark:bg-white dark:border-white text-content-inverted hover:bg-inverted hover:ring-4 hover:ring-border-subtle",
 secondary: cn(
 "border-border-subtle bg-bg-default text-content-emphasis hover:bg-bg-muted focus-visible:border-border-emphasis outline-none",
 "data-\[state=open\]:border-border-emphasis data-\[state=open\]:ring-4 data-\[state=open\]:ring-border-subtle",
 ),
 outline: "border-transparent text-content-default hover:bg-neutral-900/5",
 success:
 "border-blue-500 bg-blue-500 text-white hover:bg-blue-600 hover:ring-4 hover:ring-blue-100",
 danger:
 "border-red-500 bg-red-500 text-white hover:bg-red-600 hover:ring-4 hover:ring-red-100",
 "danger-outline":
 "border-transparent bg-white text-red-500 hover:bg-red-600 hover:text-white",
 },
 },
 defaultVariants: {
 variant: "primary",
 },
});

export interface ButtonProps
 extends React.ButtonHTMLAttributes,
 VariantProps {
 text?: ReactNode \| string;
 textWrapperClassName?: string;
 shortcutClassName?: string;
 loading?: boolean;
 icon?: ReactNode;
 shortcut?: string;
 right?: ReactNode;
 disabledTooltip?: string \| ReactNode;
}

const Button = forwardRef(
 (
 {
 text,
 variant = "primary",
 className,
 textWrapperClassName,
 shortcutClassName,
 loading,
 icon,
 shortcut,
 disabledTooltip,
 right,
 ...props
 }: ButtonProps,
 forwardedRef,
 ) =\> {
 if (disabledTooltip) {
 return (


{icon}
{text && (


{text}


)}
{shortcut && (
`
                {shortcut}
              `
)}


 );
 }
 return (

 {loading ?  : icon ? icon : null}
 {text && (


{text}


 )}
 {shortcut && (
 `
            {shortcut}
          `
 )}
 {right}

 );
 },
);

Button.displayName = "Button";

export { Button };