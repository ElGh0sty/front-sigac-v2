import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component'; // <-- Cambia 'login' por 'login.component'

describe('LoginComponent', () => {
  let component: LoginComponent;

  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent]
    })
      .compileComponents();

    // ✅ Asegúrate de tener también el genérico aquí:
    fixture = TestBed.createComponent<LoginComponent>(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
