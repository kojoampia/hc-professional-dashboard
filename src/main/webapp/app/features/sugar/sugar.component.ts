import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { StatComponent } from 'app/entities/professionalMS/stat/list/stat.component';
import { Subject } from 'rxjs';

@Component({
  selector: 'jhi-sugar',
  standalone: true,
  imports: [StatComponent],
  templateUrl: './sugar.component.html',
  styleUrl: './sugar.component.scss',
})
export class SugarComponent {
  public type = 'sugar';
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
