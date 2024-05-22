import { Component, Input } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

import SharedModule from 'app/shared/shared.module';
import { DurationPipe, FormatMediumDatetimePipe, FormatMediumDatePipe } from 'app/shared/date';
import { IHCPayOption } from '../hc-pay-option.model';

@Component({
  standalone: true,
  selector: 'hpd-hc-pay-option-detail',
  templateUrl: './hc-pay-option-detail.component.html',
  imports: [SharedModule, RouterModule, DurationPipe, FormatMediumDatetimePipe, FormatMediumDatePipe],
})
export class HCPayOptionDetailComponent {
  @Input() hCPayOption: IHCPayOption | null = null;

  constructor(protected activatedRoute: ActivatedRoute) {}

  previousState(): void {
    window.history.back();
  }
}
