/* ---------------------------------------------------------------------------
 * APP IDENTITY
 *
 * The one place the system's name and wording live. VITE_APP_NAME in .env
 * overrides the name per deployment; everything else reads from here.
 * ------------------------------------------------------------------------- */

export const APP_NAME = import.meta.env.VITE_APP_NAME || 'TambalOPD'

/** What the system is, in one line — landing page, print headers. */
export const APP_KIND = 'Outpatient Department Management System with EMR'

export const APP_TAGLINE = 'From queue to cure, in one record.'

/** "Tambal" is Visayan (Cebuano, Butuanon) for medicine; the footer says so. */
export const APP_NAME_MEANING = 'Tambal — Visayan for medicine, remedy.'
