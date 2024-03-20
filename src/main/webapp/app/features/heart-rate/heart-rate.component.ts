import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { StatComponent } from 'app/entities/professionalMS/stat/list/stat.component';
import { Subject } from 'rxjs';

@Component({
  selector: 'jhi-heart-rate',
  standalone: true,
  imports: [StatComponent],
  templateUrl: './heart-rate.component.html',
  styleUrl: './heart-rate.component.scss',
})
export class HeartRateComponent {
  public type = 'heartrate';
  private destroyed$ = new Subject<boolean>();

  constructor(private modal: NgbActiveModal) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroyed$.next(true);
    this.destroyed$.unsubscribe();
  }

  close(): void {
    this.modal.dismiss();
  }
}
