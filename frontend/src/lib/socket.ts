import { io, Socket } from 'socket.io-client';

const getSocketUrl = () => {
    // 1. Explicit socket URL
    if (process.env.NEXT_PUBLIC_SOCKET_URL) {
        return process.env.NEXT_PUBLIC_SOCKET_URL;
    }
    // 2. Derive from API URL
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, '');
    }
    // 3. Browser client-side resolution
    if (typeof window !== 'undefined') {
        const { hostname, protocol, origin } = window.location;
        if (protocol === 'https:' || hostname.includes('trycloudflare.com') || hostname.includes('cloudflare')) {
            return origin;
        }
        return `http://${hostname}:5050`;
    }
    // 4. Default fallback
    return 'http://localhost:5050';
};

let realSocket: Socket | null = null;

function getClientSocket(): Socket {
    if (typeof window === 'undefined') {
        return {
            on: () => {},
            off: () => {},
            emit: () => {},
            disconnect: () => {},
            connect: () => {},
        } as unknown as Socket;
    }
    if (!realSocket) {
        realSocket = io(getSocketUrl(), {
            autoConnect: true,
        });
    }
    return realSocket;
}

export const socket = new Proxy({} as Socket, {
    get(_target, prop) {
        const instance = getClientSocket();
        const value = Reflect.get(instance, prop);
        if (typeof value === 'function') {
            return value.bind(instance);
        }
        return value;
    }
});
