"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
export type CrayonUser={id:string;username:string;nickname?:string|null;avatarObjectId?:string|null};
type AuthContextValue={user:CrayonUser|null;token:string|null;loading:boolean;authOpen:boolean;openAuth:(returnTo?:string)=>void;closeAuth:()=>void;login:(u:string,p:string)=>Promise<void>;register:(u:string,p:string,c:string)=>Promise<void>;logout:()=>Promise<void>;api:<T>(path:string,options?:RequestInit)=>Promise<T>};
const AuthContext=createContext<AuthContextValue|null>(null);
let refreshPromise:Promise<{user:CrayonUser;accessToken:string}|null>|null=null;
let generation=0;
export function AuthProvider({children}:{children:React.ReactNode}){
 const [user,setUser]=useState<CrayonUser|null>(null);const [token,setToken]=useState<string|null>(null);const [loading,setLoading]=useState(true);const [authOpen,setAuthOpen]=useState(false);const returnTo=useRef<string|undefined>(undefined);
 const clear=useCallback(()=>{setUser(null);setToken(null)},[]);
 const refresh=useCallback(async()=>{if(!refreshPromise){const g=generation;refreshPromise=fetch("/api/auth/refresh",{method:"POST",credentials:"include"}).then(async r=>{if(!r.ok)return null;const data=await r.json();return g===generation?data:null}).catch(()=>null).finally(()=>{refreshPromise=null})}const data=await refreshPromise;if(data){setUser(data.user);setToken(data.accessToken)}else clear();return data?.accessToken??null},[clear]);
 useEffect(()=>{const timer=setTimeout(()=>{void refresh().finally(()=>setLoading(false))},0);return()=>clearTimeout(timer)},[refresh]);
 useEffect(()=>{const channel=new BroadcastChannel("crayon-auth");channel.onmessage=e=>{if(e.data==="logout")clear();if(e.data==="refresh")void refresh()};return()=>channel.close()},[clear,refresh]);
 const complete=(data:{user:CrayonUser;accessToken:string})=>{setUser(data.user);setToken(data.accessToken);setAuthOpen(false);new BroadcastChannel("crayon-auth").postMessage("refresh");if(returnTo.current==="gallery")window.dispatchEvent(new CustomEvent("crayon:open-gallery"));returnTo.current=undefined};
 const submit=async(path:string,body:object)=>{const r=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw new Error(data.error??"请求失败");complete(data)};
 const api=useCallback(async<T,>(path:string,options?:RequestInit)=>{let t=token;const request=()=>fetch(path,{...options,credentials:"include",headers:{...(options?.body?{"Content-Type":"application/json"}:{}),...(t?{Authorization:`Bearer ${t}`}:{}) ,...options?.headers}});let r=await request();if(r.status===401){t=await refresh();if(t)r=await request()}const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error??"请求失败");return data as T},[token,refresh]);
 // submit and complete are intentionally scoped to the latest provider render.
 const value=useMemo<AuthContextValue>(()=>({user,token,loading,authOpen,openAuth:(target)=>{returnTo.current=target;setAuthOpen(true)},closeAuth:()=>setAuthOpen(false),login:(u,p)=>submit("/api/auth/login",{username:u,password:p}),register:(u,p,c)=>submit("/api/auth/register",{username:u,password:p,confirmPassword:c}),logout:async()=>{generation++;clear();new BroadcastChannel("crayon-auth").postMessage("logout");await fetch("/api/auth/logout",{method:"POST",credentials:"include"}).catch(()=>undefined)},api}),[user,token,loading,authOpen,api,clear]); // eslint-disable-line react-hooks/exhaustive-deps
 return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export function useAuth(){const value=useContext(AuthContext);if(!value)throw new Error("useAuth must be used inside AuthProvider");return value}
