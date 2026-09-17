import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app'; // <-- Cambia 'App' por 'AppComponent'

describe('AppComponent', () => { // <-- Cambia 'App' por 'AppComponent'
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent], // <-- Cambia 'App' por 'AppComponent'
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent); // <-- Cambia 'App' por 'AppComponent'
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(AppComponent); // <-- Cambia 'App' por 'AppComponent'
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Hello, front');
  });
});
