import {NextAuthOptions} from "next-auth";
import GoogleProvider from 'next-auth/providers/google'
import {PrismaAdapter} from '@next-auth/prisma-adapter'
import { prisma } from "./prisma";
import { User } from './generated/prisma';


export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        session: ({ session,user }) => {
            return {
                ...session,
                user: {
                    ...session.user,
                    id: (user as User).id,
                    role: (user as User).role,
                }
            }
        },
        jwt: ({ token, user}) => {
            if(user) {
                token.role = (user as User).role;
            }
            return token;
        },
    },
    pages: {
        signIn: '/auth/signin',
        error: '/auth/error',
    },
    session: {
        strategy: 'database',
    },
    debug: process.env.NODE_ENV === 'development',
}