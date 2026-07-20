import { Component } from '@angular/core';
import SharedModule from 'app/shared/shared.module';
import dayjs from 'dayjs/esm';

@Component({
  selector: 'jhi-footer',
  templateUrl: './footer.component.html',
  imports: [SharedModule],
})
export default class FooterComponent {
  year = dayjs().year();
}
