import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TemperatureComponent } from './temperature/temperature.component';
import { SugarComponent } from './sugar/sugar.component';
import { HeartRateComponent } from './heart-rate/heart-rate.component';
import { EmergencyComponent } from './emergency/emergency.component';
import { BloodPressureComponent } from './blood-pressure/blood-pressure.component';
import { AllergyComponent } from './allergies/allergy.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    TemperatureComponent,
    SugarComponent,
    HeartRateComponent,
    EmergencyComponent,
    BloodPressureComponent,
    AllergyComponent,
  ],
  exports: [TemperatureComponent, SugarComponent, HeartRateComponent, EmergencyComponent, BloodPressureComponent, AllergyComponent],
})
export class FeaturesModule {}
