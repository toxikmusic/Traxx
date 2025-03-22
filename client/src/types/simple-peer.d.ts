/**
 * Type definitions for simple-peer
 */

declare module 'simple-peer' {
  interface SimplePeerOptions {
    initiator?: boolean;
    channelConfig?: object;
    channelName?: string;
    config?: object;
    offerConstraints?: object;
    answerConstraints?: object;
    sdpTransform?: (sdp: string) => string;
    stream?: MediaStream;
    streams?: MediaStream[];
    trickle?: boolean;
    allowHalfTrickle?: boolean;
    objectMode?: boolean;
    wrtc?: object;
  }

  interface SimplePeerInstance {
    signal: (data: any) => void;
    on: (event: string, callback: (data?: any) => void) => void;
    destroy: () => void;
    send: (data: any) => void;
  }

  interface SimplePeerStatic {
    new (opts?: SimplePeerOptions): SimplePeerInstance;
    (opts?: SimplePeerOptions): SimplePeerInstance;
    WEBRTC_SUPPORT: boolean;
  }

  const SimplePeer: SimplePeerStatic;
  export = SimplePeer;
}