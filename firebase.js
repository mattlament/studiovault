const firebaseConfig = {
  apiKey: "AIzaSyC-qUsW2JmjDkcLfB1W7kT-jQtxFi6VfEk",
  authDomain: "matt-vault-app.firebaseapp.com",
  projectId: "matt-vault-app",
  storageBucket: "matt-vault-app.firebasestorage.app",
  messagingSenderId: "435451171052",
  appId: "1:435451171052:web:9643b9194436f8691f95c9",
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const linksCol = collection(db, "userLinks");

// CRUD - create read update delete

export const fetchData = async () => {
  const snapshot = await getDocs(linksCol);
  return snapshot.docs.map((d) => ({ firestoreId: d.id, ...d.data() }));
};

export const addLink = async (title, url, tags = []) => {
  const docRef = await addDoc(linksCol, { title, url, tags, id: Date.now() });
  return docRef.id;
};

export const editLink = async (firestoreId, title, url, tags) => {
  await updateDoc(doc(db, "userLinks", firestoreId), { title, url, tags });
};

export const deleteLink = async (firestoreId) => {
  await deleteDoc(doc(db, "userLinks", firestoreId));
};
