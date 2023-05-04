// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
import { getStorage } from "firebase/storage";
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD1hiRuUKeGHHtQPstToCrKjnnYWgYJ2PE",
  authDomain: "shisiedo-bot.firebaseapp.com",
  databaseURL: "https://shisiedo-bot.firebaseio.com",
  projectId: "shisiedo-bot",
  storageBucket: "shisiedo-bot.appspot.com",
  messagingSenderId: "1094438308096",
  appId: "1:1094438308096:web:fff1cd043ac0eae1230be5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Storage and get a reference to the service
const storage = getStorage(app);

export default storage;