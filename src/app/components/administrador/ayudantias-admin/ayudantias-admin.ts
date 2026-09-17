import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AyudantiasDashboardComponent } from '../ayudantias-dashboard/ayudantias-dashboard';

@Component({
  selector: 'app-ayudantias-admin',
  standalone: true,
  imports: [CommonModule, AyudantiasDashboardComponent],
  template: `<app-ayudantias-dashboard [tabInicial]="'solicitudes'"></app-ayudantias-dashboard>`
})
export class AyudantiasAdminComponent {}
