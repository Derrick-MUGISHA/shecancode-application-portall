"use client"
import { createContext, useContext } from "react"
export const AdminPrivacyContext=createContext(false)
export const useAdminPrivacy=()=>useContext(AdminPrivacyContext)
