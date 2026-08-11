export class Registration {
  constructor(
    public login: string,
    public email: string,
    public password: string,
    public langKey: string,
  ) {}
}

/**
 * Answer from `GET api/register/login-available`.
 *
 * `login` is the *normalised* value the server checked — trimmed and lower-cased, since that is what
 * it stores. Display this rather than what was typed, or the form can approve `JDoe` while `jdoe` is
 * registered.
 *
 * Advisory only: nothing is reserved, so a login reported available can be taken before the form is
 * submitted. Registration's 400 remains the authority and the component still handles it.
 */
export interface LoginAvailability {
  login: string;
  available: boolean;
  suggestions: string[];
}
