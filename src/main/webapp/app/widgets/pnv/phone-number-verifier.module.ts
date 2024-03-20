import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhoneNumberVerifierComponent } from './phone-number-verifier.component';
import { PhoneNumberVerifierService } from './phone-number-verifier.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NgJhipsterModule } from 'ng-jhipster';

@NgModule({
  exports: [PhoneNumberVerifierComponent],
  declarations: [PhoneNumberVerifierComponent],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, NgJhipsterModule],
  providers: [PhoneNumberVerifierService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class PhoneNumberVerifierModule {}
