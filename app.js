import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* 🔴 Firebase設定 */
const firebaseConfig = {
apiKey: "AIzaSyCdDf0GH80PoGlcbk2yjlaVQfP01Gk9m18",
  authDomain: "noteeditor-ba1db.firebaseapp.com",
  projectId: "noteeditor-ba1db",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ---------- DOM ---------- */
const views = {
  login: document.getElementById('view-login'),
  list: document.getElementById('view-list'),
  editor: document.getElementById('view-editor')
};

const editor = document.getElementById('editor');
const titleInput = document.getElementById('title');
const memoList = document.getElementById('memo-list');

const userInfo = document.getElementById('user-info');
const userPhoto = document.getElementById('user-photo');

/* ---------- View ---------- */
function show(view) {
  Object.values(views).forEach(v => v.hidden = true);
  views[view].hidden = false;
}

/* ---------- Auth ---------- */
login.onclick = () =>
  signInWithEmailAndPassword(auth, email.value, password.value);

signup.onclick = () =>
  createUserWithEmailAndPassword(auth, email.value, password.value);

logout.onclick = () => signOut(auth);

const provider = new GoogleAuthProvider();
googleLogin.onclick = () => signInWithRedirect(auth, provider);

getRedirectResult(auth).catch(() => {});

/* ---------- State ---------- */
let currentMemoId = null;

/* ---------- Auth state ---------- */
onAuthStateChanged(auth, async user => {
  if (!user) {
    show('login');
    userInfo.hidden = true;
    return;
  }

  userInfo.hidden = false;
  userPhoto.src = user.photoURL || 'https://www.gravatar.com/avatar/?d=mp';

  const memoId = location.hash.replace('#', '');
  if (memoId) {
    openEditor(memoId);
  } else {
    loadMemos();
    show('list');
  }
});

/* ---------- Load list ---------- */
async function loadMemos() {
  memoList.innerHTML = '';
  const q = collection(db, 'users', auth.currentUser.uid, 'memos');
  const snap = await getDocs(q);

  snap.forEach(d => {
    const li = document.createElement('li');
    li.textContent = d.data().title || 'Untitled';
    li.onclick = () => openEditor(d.id);
    memoList.appendChild(li);
  });
}

/* ---------- New memo ---------- */
newMemo.onclick = async () => {
  const q = collection(db, 'users', auth.currentUser.uid, 'memos');
  const snap = await getDocs(q);

  const ref = await addDoc(q, {
    title: `New memo ${snap.size + 1}`,
    content: '',
    updated: Date.now()
  });

  openEditor(ref.id);
};

/* ---------- Open editor ---------- */
async function openEditor(id) {
  currentMemoId = id;
  location.hash = id;

  const ref = doc(db, 'users', auth.currentUser.uid, 'memos', id);
  const snap = await getDoc(ref);
  const data = snap.data();

  titleInput.value = data.title || '';
  editor.innerHTML = data.content || '';
  show('editor');
}

/* ---------- Back ---------- */
back.onclick = () => {
  location.hash = '';
  currentMemoId = null;
  loadMemos();
  show('list');
};

/* ---------- Save ---------- */
async function save() {
  if (!currentMemoId) return;
  await setDoc(
    doc(db, 'users', auth.currentUser.uid, 'memos', currentMemoId),
    {
      title: titleInput.value || 'Untitled',
      content: editor.innerHTML,
      updated: Date.now()
    },
    { merge: true }
  );
}

editor.addEventListener('input', save);
titleInput.addEventListener('input', save);

/* ---------- Delete (確認付き) ---------- */
deleteBtn.onclick = async () => {
  if (!currentMemoId) return;

  const ok = confirm('このメモを削除しますか？');
  if (!ok) return;

  await deleteDoc(
    doc(db, 'users', auth.currentUser.uid, 'memos', currentMemoId)
  );

  location.hash = '';
  currentMemoId = null;
  loadMemos();
  show('list');
};

/* ---------- Paste ---------- */
editor.addEventListener('paste', e => {
  e.preventDefault();
  const range = document.getSelection().getRangeAt(0);

  for (const item of e.clipboardData.items) {
    if (item.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const img = document.createElement('img');
        img.src = reader.result;
        range.insertNode(img);
        range.collapse(false);
      };
      reader.readAsDataURL(item.getAsFile());
      return;
    }
  }

  const text = e.clipboardData.getData('text/plain');
  const yt = text.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);

  if (yt) {
    const wrap = document.createElement('div');
    wrap.className = 'video';
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${yt[1]}`;
    iframe.allowFullscreen = true;
    wrap.appendChild(iframe);
    range.insertNode(wrap);
    range.collapse(false);
  } else {
    document.execCommand('insertText', false, text);
  }
});
