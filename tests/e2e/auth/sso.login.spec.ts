import { test as base } from '@playwright/test';
import { user, company, secondCompany } from '../support/helper';
import { LoginPage, SSOPage, SettingsPage } from '../support/fixtures';

const SSO_METADATA_URL = [
  `${process.env.MOCKSAML_ORIGIN}/api/saml/metadata`,
  `${process.env.MOCKSAML_ORIGIN}/api/namespace/test/saml/metadata`,
];

type SSOLoginFixture = {
  loginPage: LoginPage;
  ssoPageCompany: SSOPage;
  ssoPageSecondCompany: SSOPage;
  settingsPage: SettingsPage;
};

const test = base.extend<SSOLoginFixture>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(loginPage);
  },
  ssoPageCompany: async ({ page }, use) => {
    const ssoPage = new SSOPage(page, company.slug);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(ssoPage);
  },
  ssoPageSecondCompany: async ({ page }, use) => {
    const ssoPage = new SSOPage(page, secondCompany.slug);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(ssoPage);
  },
  settingsPage: async ({ page }, use) => {
    const settingsPage = new SettingsPage(page, user.name);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(settingsPage);
  },
});

test('Create SSO connection for company', async ({
  loginPage,
  ssoPageCompany: ssoPage,
}) => {
  await loginPage.goto();
  await loginPage.credentialLogin(user.email, user.password);
  await loginPage.loggedInCheck(company.slug);
  await ssoPage.goto();
  await ssoPage.createSSOConnection({ metadataUrl: SSO_METADATA_URL[0] });
});

test('Login with SSO', async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.ssoLogin(user.email);
  await loginPage.loggedInCheck(company.slug);
});

test('Create a new company', async ({ settingsPage, loginPage }) => {
  await loginPage.goto();
  await loginPage.credentialLogin(user.email, user.password);
  await loginPage.loggedInCheck(company.slug);
  await settingsPage.createNewCompany(secondCompany.name);
});

test('SSO login with 2 companies & one SSO connection', async ({
  loginPage,
  settingsPage,
}) => {
  await loginPage.goto();
  await loginPage.ssoLogin(user.email);
  await settingsPage.isLoggedIn();
});

test('Create SSO connection for new company', async ({
  loginPage,
  ssoPageSecondCompany: ssoPage,
  settingsPage,
}) => {
  await loginPage.goto();
  await loginPage.ssoLogin(user.email);
  await settingsPage.isLoggedIn();

  await ssoPage.goto();
  await ssoPage.createSSOConnection({ metadataUrl: SSO_METADATA_URL[1] });
});

test('SSO login with 2 companies & two SSO connection', async ({
  loginPage,
  ssoPageSecondCompany: ssoPage,
}) => {
  await loginPage.goto();
  await loginPage.ssoLogin(user.email, true);

  await loginPage.isMultipleCompanyErrorVisible();

  await loginPage.ssoLoginWithSlug(company.slug);
  await ssoPage.goto();

  await ssoPage.openEditSSOConnectionView();
  await ssoPage.deleteSSOConnection();
  await ssoPage.checkEmptyConnectionList();
});

test('Delete SSO connection', async ({
  loginPage,
  ssoPageCompany: ssoPage,
  settingsPage,
}) => {
  await loginPage.goto();
  await loginPage.ssoLogin(user.email);
  await settingsPage.isLoggedIn();

  await ssoPage.goto();
  await ssoPage.openEditSSOConnectionView();
  await ssoPage.deleteSSOConnection();
  await ssoPage.checkEmptyConnectionList();
});

test('Remove second company', async ({ loginPage, settingsPage }) => {
  await loginPage.goto();
  await loginPage.credentialLogin(user.email, user.password);
  await settingsPage.isLoggedIn();

  await settingsPage.removeCompany(secondCompany.slug);
});
