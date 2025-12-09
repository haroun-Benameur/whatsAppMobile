// Import the functions you need from the SDKs you need
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://cikwlvezvmjximsvrowh.supabase.co'
const supabaseKey = "sb_publishable_B5oYKTC-VIm0MEfU2MqwHA_kIV-BD4e"
export const supabase = createClient(supabaseUrl, supabaseKey)

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAyHUQIoui-3JucNO9aflOugYiFbF-CweY",
  authDomain: "whatsapp-5dc44.firebaseapp.com",
  databaseURL:"https://whatsapp-5dc44-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "whatsapp-5dc44",
  storageBucket: "whatsapp-5dc44.firebasestorage.app",
  messagingSenderId: "158854174982",
  appId: "1:158854174982:web:d8b110628e90c2c2eda687",
  measurementId: "G-9RB963E8KB",
};


const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
export default app;

