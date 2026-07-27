import { cn } from "@dub/utils";
import { AlertCircle } from "lucide-react";
import React, { useCallback, useState } from "react";
import { Eye, EyeSlash } from "./icons";

export interface InputProps
 extends React.InputHTMLAttributes {
 error?: string;
}

const Input = React.forwardRef(
 ({ className, type, ...props }, ref) => {
 const \[isPasswordVisible, setIsPasswordVisible\] = useState(false);

 const toggleIsPasswordVisible = useCallback(
 () =\> setIsPasswordVisible(!isPasswordVisible),
 \[isPasswordVisible, setIsPasswordVisible\],
 );

 return (


{props.error && (


)}
{type === "password" && (
toggleIsPasswordVisible()}
aria-label={
isPasswordVisible ? "Hide password" : "Show Password"
}
>
{isPasswordVisible ? (

) : (

)}

)}


{props.error && (

{props.error}

)}


 );
 },
);

Input.displayName = "Input";

export { Input };