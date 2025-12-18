
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBKpWJG_HnK1oueqNfL2AxeAAVHwiBnSAY",
  authDomain: "truque-do-psyllium.firebaseapp.com",
  projectId: "truque-do-psyllium",
  storageBucket: "truque-do-psyllium.firebasestorage.app",
  messagingSenderId: "266784345006",
  appId: "1:266784345006:web:44cb037efffbc5461d163f",
  measurementId: "G-9CLYEQXJQ6"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
