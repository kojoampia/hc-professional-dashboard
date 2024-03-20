import { NgModule } from '@angular/core';
import { StatusComponent } from './status.component';
import { StatusService } from './status.service';

@NgModule({
  imports: [StatusComponent],
  exports: [StatusComponent],
  providers: [StatusService],
})
export class StatusModule {}
