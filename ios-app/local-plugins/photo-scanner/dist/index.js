import { registerPlugin } from '@capacitor/core';

// Registered natively as "PhotoScanner". The BoxdSeats web app (loaded remotely
// in the shell) calls it via window.Capacitor.Plugins.PhotoScanner; this export
// exists so `cap sync` recognizes the package as a Capacitor plugin.
export const PhotoScanner = registerPlugin('PhotoScanner');
