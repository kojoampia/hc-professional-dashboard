import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject } from 'rxjs';
import { IStat } from 'app/entities/professionalMS/stat/stat.model';
import { StatComponent } from 'app/entities/professionalMS/stat/list/stat.component';

@Component({
  selector: 'jhi-temperature',
  standalone: true,
  imports: [StatComponent],
  templateUrl: './temperature.component.html',
  styleUrl: './temperature.component.scss',
})
export class TemperatureComponent implements OnDestroy, OnInit {
  public type = 'temperature';
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
