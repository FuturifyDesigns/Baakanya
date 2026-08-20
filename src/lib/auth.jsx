/* eslint-disable react-refresh/only-export-components */
import { createContext,useContext,useEffect,useMemo,useState } from 'react'
import { isSupabaseConfigured,supabase } from './supabase'
const AuthContext=createContext(null)
export function AuthProvider({children}){const[session,setSession]=useState(null);const[loading,setLoading]=useState(isSupabaseConfigured);useEffect(()=>{if(!supabase)return;supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)});const{data}=supabase.auth.onAuthStateChange((_event,next)=>setSession(next));return()=>data.subscription.unsubscribe()},[]);const value=useMemo(()=>({session,user:session?.user??null,loading,configured:isSupabaseConfigured,signOut:()=>supabase?.auth.signOut()}),[session,loading]);return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>}
export const useAuth=()=>useContext(AuthContext)
