import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AyudantiasDashboardComponent } from '../ayudantias-dashboard/ayudantias-dashboard';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, AyudantiasDashboardComponent],
  template: `<app-ayudantias-dashboard [tabInicial]="'reportes'"></app-ayudantias-dashboard>`
})
export class ReportesComponent {}
