import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/utils/db/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Login",
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        
        if (!credentials?.email || !credentials?.password) return null;
        
        try {
          // Login ke Firebase Auth
          const userCredential = await signInWithEmailAndPassword(
            auth,
            credentials.email,
            credentials.password
          );
          
          const firebaseUser = userCredential.user;
          
          // Ambil data dari Firestore (collection: admin)
          const q = query(
            collection(db, "admin"),
            where("email", "==", firebaseUser.email)
          );

          const snapshot = await getDocs(q);
          
          if (snapshot.empty) return null;
          
          const userData = snapshot.docs[0].data();

          // Return ke NextAuth session
          return {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: userData.name,
          };
        } catch (error) {
          console.log(error);
          return null;
        }
      },
    }),
  ],

  pages: {
    signIn: "/auth/login",
  },

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.name = user.name ?? undefined;
        token.email = user.email ?? undefined;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.name = token.name;
        session.user.email = token.email;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);