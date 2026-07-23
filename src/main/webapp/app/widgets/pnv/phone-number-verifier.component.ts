import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { PhoneNumberVerifierService } from './phone-number-verifier.service';
import { JhiEventManager } from 'ng-jhipster';
import { Subscription } from 'rxjs';
import { HttpResponse } from '@angular/common/http';
import { validatePhoneCode } from '../../shared/util/validators';

@Component({
  selector: 'hpd-phone-number-verifier',
  standalone: true,
  templateUrl: './phone-number-verifier.component.html',
  styleUrls: ['./phone-number-verifier.component.scss'],
})
export class PhoneNumberVerifierComponent implements OnInit, OnDestroy {
  @Input() destinationNumber = '';
  @Input() checkPhoneNumber = false;
  @Output() numberVerified: EventEmitter<any> = new EventEmitter();

  codeVerificationStatus = '';

  isCodeVerified = false;
  isCodeNumberValid = false;
  isCodeNumberChecking = false;
  showCodeInput = false;
  eventSubscriber!: Subscription;
  registerForm = this.fb.group({
    verificationCode: ['', Validators.required, Validators.minLength(5), Validators.maxLength(5), validatePhoneCode()],
  });

  constructor(
    private phoneVerifierService: PhoneNumberVerifierService,
    private fb: FormBuilder,
    private eventManager: JhiEventManager,
  ) {}

  ngOnInit(): void {
    this.registerForm.get('verificationCode')?.setValue('');
    this.registerForm.get('verificationCode')?.enable();
  }

  ngOnDestroy(): void {
    this.registerForm.get('verificationCode')?.setValue('');
    this.registerForm.get('verificationCode')?.enable();
    if (this.eventSubscriber) {
      this.eventSubscriber.unsubscribe();
      this.eventManager.destroy(this.eventSubscriber);
    }
  }

  verifyCode(): void {
    this.codeVerificationStatus = '';
    this.isCodeNumberValid = false;
    const codeToVerify = '' + this.registerForm.get('verificationCode')?.value;
    const codeLength = codeToVerify.length;
    if (codeLength === 5) {
      this.isCodeNumberChecking = true;
      try {
        this.registerForm.get('verificationCode')?.disable();
        this.isCodeNumberValid = true;
        const verificationCode = Number.parseInt(codeToVerify, 10);
        this.verifyCodeNumber(verificationCode);
      } catch (error) {
        this.isCodeNumberValid = false;
        this.codeVerificationStatus = error as string;
        this.registerForm.get('verificationCode')?.setValue('');
        this.registerForm.get('verificationCode')?.enable();
      }
    }
  }

  verifyPhoneNumber(): void {
    this.showCodeInput = true;
    this.isCodeNumberChecking = false;
    const shortMessageDestination = {
      destination: this.destinationNumber,
    };
    this.phoneVerifierService.sendPhoneNumberVerification(shortMessageDestination).subscribe((res: HttpResponse<any>) => {
      res.status === 200 ? this.eventManager.broadcast('code-sent') : this.eventManager.broadcast('failed-sending-code');
      this.registerForm.get('verificationCode')?.enable();
    });
  }

  verifyCodeNumber(verificationCode: number): void {
    // const verificationCode = this.registerForm.get('verificationCode')?.value;
    const shortMessageDestination = {
      destination: this.destinationNumber,
      msgId: verificationCode,
    };
    this.phoneVerifierService.verifyPhoneNumberCode(shortMessageDestination).subscribe(
      (res: HttpResponse<any>) => {
        res.status === 200 ? (this.isCodeVerified = true) : (this.isCodeVerified = false);
        this.showCodeInput = this.checkPhoneNumber = !this.isCodeVerified;
        this.numberVerified.emit(this.isCodeVerified);
        this.registerForm.get('verificationCode')?.setValue('');
        this.registerForm.get('verificationCode')?.enable();
      },
      (err: any) => {
        this.codeVerificationStatus = err.statusText;
        this.registerForm.get('verificationCode')?.setValue('');
        this.registerForm.get('verificationCode')?.enable();
      },
    );
  }
}
