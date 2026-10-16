import { AccountStatus } from 'app/account/user/account-status.enum';

export class Account {
  constructor(
    public activated: boolean,
    public authorities: string[],
    public email: string,
    public firstName: string | null,
    public langKey: string,
    public lastName: string | null,
    public login: string,
    public imageUrl: string | null,
    /**
     * Where onboarding step 1 stands, as the **gateway** records it — `backlog.md` row 249.
     *
     * <p>⚠ **Optional, and it will be absent for a while.** The gateway stamps `COMPLETED` only
     * when an account is next saved with all four required fields present, so every account that
     * completed step 1 before that shipped reads `undefined` here until it is edited again — and
     * an older gateway serves no such field at all. ⛔ So `undefined` means *not known*, never
     * *not complete*; `WizardService.accountStepComplete` is the one place that distinction is
     * handled, by falling back to the four fields.
     *
     * <p>⛔ **Read-only.** `PUT /api/account` takes five values by name and this is not one of
     * them; a status a client could post would be a client declaring its own onboarding complete.
     */
    public accountStatus?: AccountStatus | null,
  ) {}
}
