import { Platform } from 'react-native';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { api } from '@/services/api';

export interface Education {
  id: string;
  level: string;
  degree: string;
  field: string;
  institution: string;
  year: string;
}

export interface Expertise {
  id: string;
  nameTH: string;
  nameEN: string;
  group: string;
  field: string;
}

export interface UserProfile {
  id?: number | string;
  name: string;
  email: string;
  faculty: string;
  major: string;
  position: string;
  phone: string;
  role: 'admin' | 'user';
  avatar: string;
  // extended fields
  prefix: string;
  firstName: string;
  lastName: string;
  group: string;
  address: string;
  birthday: string;
  lineId: string;
  idCard: string;
  education: Education[];
  expertise: Expertise[];
}

export const DEFAULT_USER: UserProfile = {
  name: 'ผู้ใช้ระบบ',
  email: '',
  faculty: '',
  major: '',
  position: '',
  phone: '',
  role: 'user',
  avatar: '',
  prefix: '',
  firstName: '',
  lastName: '',
  group: 'วิชาการ',
  address: '',
  birthday: '',
  lineId: '',
  idCard: '',
  education: [],
  expertise: [],
};

interface UserContextType {
  user: UserProfile;
  saveUser: (u: Partial<UserProfile>) => Promise<void>;
  loadUser: () => Promise<void>;
  clearUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: DEFAULT_USER,
  saveUser: async () => {},
  loadUser: async () => {},
  clearUser: async () => {},
});

export const useUser = () => useContext(UserContext);

const KEY = 'user_profile';

async function readStorage(): Promise<string | null> {
  if (Platform.OS === 'web') return localStorage.getItem(KEY);
  const { default: AS } = await import('@react-native-async-storage/async-storage');
  return AS.getItem(KEY);
}

async function writeStorage(val: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(KEY, val);
  } else {
    const { default: AS } = await import('@react-native-async-storage/async-storage');
    await AS.setItem(KEY, val);
  }
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile>(DEFAULT_USER);

  useEffect(() => { loadUser(); }, []);

  const loadUser = async () => {
    try {
      const raw = await readStorage();
      const cached = raw ? JSON.parse(raw) : {};
      const remote = await api.getProfile();
      const merged = { ...DEFAULT_USER, ...cached, ...(remote || {}) };
      setUser(merged);
      if (remote) await writeStorage(JSON.stringify(merged));
    } catch {}
  };

  const saveUser = async (u: Partial<UserProfile>) => {
    const merged = { ...user, ...u };
    setUser(merged);
    try { await writeStorage(JSON.stringify(merged)); } catch {}
  };

  const clearUser = async () => {
    setUser(DEFAULT_USER);
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(KEY);
      } else {
        const { default: AS } = await import('@react-native-async-storage/async-storage');
        await AS.removeItem(KEY);
      }
    } catch {}
  };

  return (
    <UserContext.Provider value={{ user, saveUser, loadUser, clearUser }}>
      {children}
    </UserContext.Provider>
  );
}
