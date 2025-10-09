import { test as base } from '@playwright/test';
import { user, company } from '../support/helper';
import { JoinPage, LoginPage, SettingsPage } from '../support/fixtures';
import { prisma } from '@/lib/prisma';

const companyNewInfo = {
  name: 'New Company Name',
  slug: 'new company example',
  sluggified: 'new-company-example',
} as const;

type CompanySettingsFixture = {
  loginPage: LoginPage;
  joinPage: JoinPage;
  settingsPage: SettingsPage;
};

const test = base.extend<CompanySettingsFixture>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(loginPage);
  },
  joinPage: async ({ page }, use) => {
    const joinPage = new JoinPage(page, user, company.name);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(joinPage);
  },
  settingsPage: async ({ page }, use) => {
    const settingsPage = new SettingsPage(page, company.slug);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(settingsPage);
  },
});

test.afterAll(async () => {
  await prisma.company.update({
    where: { slug: companyNewInfo.sluggified },
    data: { name: company.name, slug: company.slug },
  });
});

test('Should be able to update company name', async ({
  loginPage,
  settingsPage,
}) => {
  await loginPage.goto();
  await loginPage.credentialLogin(user.email, user.password);
  await loginPage.loggedInCheck(company.slug);

  await settingsPage.goto(company.slug);
  await settingsPage.updateCompanyName(companyNewInfo.name);

  await settingsPage.page.reload();
  await settingsPage.isSettingsPageVisible();
  await settingsPage.checkCompanyName(companyNewInfo.name);
});

test('Should not allow to update company name with empty value', async ({
  loginPage,
  settingsPage,
}) => {
  await loginPage.goto();
  await loginPage.credentialLogin(user.email, user.password);
  await loginPage.loggedInCheck(company.slug);

  await settingsPage.goto(company.slug);
  await settingsPage.fillCompanyName('');
  await settingsPage.isSaveButtonDisabled();
});

test('Should not allow to update company name with more than 50 characters', async ({
  loginPage,
  settingsPage,
}) => {
  await loginPage.goto();
  await loginPage.credentialLogin(user.email, user.password);
  await loginPage.loggedInCheck(company.slug);

  await settingsPage.goto(company.slug);
  await settingsPage.fillCompanyName('a'.repeat(51));
  await settingsPage.isSaveButtonDisabled();
  await settingsPage.isCompanyNameLengthErrorVisible();
});

test('Should be able to update company slug', async ({
  loginPage,
  settingsPage,
}) => {
  await loginPage.goto();
  await loginPage.credentialLogin(user.email, user.password);
  await loginPage.loggedInCheck(company.slug);

  await settingsPage.goto(company.slug);
  await settingsPage.updateCompanySlug(companyNewInfo.slug);

  await settingsPage.isSettingsPageVisible();
  await settingsPage.checkCompanySlug(companyNewInfo.sluggified);
});

test('Should not allow empty slug', async ({ loginPage, settingsPage }) => {
  await loginPage.goto();
  await loginPage.credentialLogin(user.email, user.password);
  await loginPage.loggedInCheck(companyNewInfo.sluggified);

  await settingsPage.goto(companyNewInfo.sluggified);
  await settingsPage.fillCompanySlug('');
  await settingsPage.isSaveButtonDisabled();
});

test('Should not allow to update company slug with more than 50 characters', async ({
  loginPage,
  settingsPage,
}) => {
  await loginPage.goto();
  await loginPage.credentialLogin(user.email, user.password);
  await loginPage.loggedInCheck(companyNewInfo.sluggified);

  await settingsPage.goto(companyNewInfo.sluggified);
  await settingsPage.fillCompanySlug('a'.repeat(51));
  await settingsPage.isSaveButtonDisabled();
  await settingsPage.isCompanySlugLengthErrorVisible();
});

test('Should be able to set domain in company settings', async ({
  loginPage,
  settingsPage,
}) => {
  await loginPage.goto();
  await loginPage.credentialLogin(user.email, user.password);
  await loginPage.loggedInCheck(companyNewInfo.sluggified);

  await settingsPage.goto(companyNewInfo.sluggified);
  await settingsPage.updateDomain('example.com');
  await settingsPage.page.reload();
  await settingsPage.isSettingsPageVisible();
  await settingsPage.checkDomain('example.com');
});

test('Should not allow to set domain with more than 253 characters', async ({
  loginPage,
  settingsPage,
}) => {
  await loginPage.goto();
  await loginPage.credentialLogin(user.email, user.password);
  await loginPage.loggedInCheck(companyNewInfo.sluggified);

  await settingsPage.goto(companyNewInfo.sluggified);
  await settingsPage.fillDomain('a'.repeat(256) + '.com');
  await settingsPage.isSaveButtonDisabled();
  await settingsPage.isDomainLengthErrorVisible();
});

test('Should not allow to set invalid domain', async ({
  loginPage,
  settingsPage,
}) => {
  await loginPage.goto();
  await loginPage.credentialLogin(user.email, user.password);
  await loginPage.loggedInCheck(companyNewInfo.sluggified);

  await settingsPage.goto(companyNewInfo.sluggified);
  await settingsPage.fillDomain('example');
  await settingsPage.isSaveButtonDisabled();
  await settingsPage.isDomainInvalidErrorVisible();
});
