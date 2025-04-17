const { Sequelize, DataTypes, Model } = require("sequelize");
const { sequelize } = require("./connection");

db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.User = require("../models/user")(sequelize, DataTypes, Model);
db.Token = require("../models/token")(sequelize, DataTypes, Model);
db.Branch = require("../models/branch")(sequelize, DataTypes, Model);
db.Holiday = require("../models/holidays")(sequelize, DataTypes, Model);
db.Absences = require("../models/absences")(sequelize, DataTypes, Model);
db.Absence_request = require("../models/absence_request")(sequelize, DataTypes, Model);
db.Company = require("../models/company")(sequelize, DataTypes, Model);
db.Document = require("../models/documents")(sequelize, DataTypes, Model);
db.Job_category = require("../models/job_category")(sequelize, DataTypes, Model);
db.Job_title = require("../models/job_title")(sequelize, DataTypes, Model);
db.Project = require("../models/projects")(sequelize, DataTypes, Model);
db.Client = require("../models/client")(sequelize, DataTypes, Model);
db.Notification = require("../models/notification")(sequelize, DataTypes, Model);
db.Clock_entry = require("../models/clock_entry")(sequelize, DataTypes, Model);


db.User.hasMany(db.Token, {
    foreignKey: 'user_id',
    as: 'user_tokens'
});
db.Token.belongsTo(db.User, {
    foreignKey: 'user_id'
});

db.Company.hasMany(db.User, {
    foreignKey: 'company_id',
    as: 'users'
});
db.User.belongsTo(db.Company, {
    foreignKey: 'company_id',
    as: 'company'
});
db.Job_category.hasMany(db.User, {
    foreignKey: 'job_category_id',
    as: 'job_category_users'
});
db.User.belongsTo(db.Job_category, {
    foreignKey: 'job_category_id',
    as: 'job_category'
});
db.Job_title.hasMany(db.User, {
    foreignKey: 'job_title_id',
    as: 'job_title_users'
});
db.User.belongsTo(db.Job_title, {       
    foreignKey: 'job_title_id',
    as: 'job_title'
});


db.User.hasMany(db.Branch, {
    foreignKey: 'user_id',
    as: 'branches'
});
db.Branch.belongsTo(db.User, {
    foreignKey: 'user_id',
    as: 'user'
});

db.User.hasMany(db.Absences, {
    foreignKey: 'user_id',
    as: 'absences'
});
db.Absences.belongsTo(db.User, {
    foreignKey: 'user_id',
    as: 'user'
});

db.User.hasMany(db.Absence_request, {
    foreignKey: 'worker_id',
    as: 'absence_requests'
});
db.Absence_request.belongsTo(db.User, {
    foreignKey: 'worker_id',
    as: 'user'
});

db.User.hasOne(db.Company, {
    foreignKey: 'owner_id',
    as: 'companies'
});
db.Company.belongsTo(db.User, {
    foreignKey: 'owner_id',
    as: 'owner'
});


db.User.hasMany(db.Document, {
    foreignKey: 'worker_id',
    as: 'documents'
}); 
db.Document.belongsTo(db.User, {
    foreignKey: 'worker_id',
    as: 'user'
});

db.Project.hasMany(db.Document, {
    foreignKey: 'project_id',
    as: 'project_documents'
});         
db.Document.belongsTo(db.Project, {
    foreignKey: 'project_id',
    as: 'project'
});

db.Company.hasMany(db.Job_category, {
    foreignKey: 'company_id',
    as: 'company_job_categoies'
});
db.Job_category.belongsTo(db.Company, {
    foreignKey: 'company_id',
    as: 'company'
});
// db.User.hasMany(db.Job_category, {
//     foreignKey: 'owner_id',
//     as: 'job_categories'
// });
// db.Job_category.belongsTo(db.User, {
//     foreignKey: 'owner_id',
//     as: 'user'
// });

db.Company.hasMany(db.Job_title, {
    foreignKey: 'company_id',
    as: 'company_job_titles'
});
db.Job_title.belongsTo(db.Company, {
    foreignKey: 'company_id',
    as: 'company'
});
db.Job_category.hasMany(db.Job_title, {
    foreignKey: 'job_category_id',
    as: 'job_titles'
}); 
db.Job_title.belongsTo(db.Job_category, {
    foreignKey: 'job_category_id',
    as: 'job_category'
});

db.Company.hasMany(db.Project, {
    foreignKey: 'company_id',
    as: 'company_projects'
});
db.Project.belongsTo(db.Company, {
    foreignKey: 'company_id',
    as: 'company'
});

db.Company.hasMany(db.Client, {
    foreignKey: 'company_id',
    as: 'client_detail'
}); 
db.Client.belongsTo(db.Company, {
    foreignKey: 'company_id',
    as: 'company'
});


db.Client.hasMany(db.Project, {
    foreignKey: 'client_id',
    as: 'projects'
}); 
db.Project.belongsTo(db.Client, {
    foreignKey: 'client_id',
    as: 'client'
});

db.Branch.hasMany(db.Company, {
    foreignKey: 'industry_id',
    as: 'companies' 
});
db.Company.belongsTo(db.Branch, {
    foreignKey: 'industry_id',
    as: 'industry' 
});

db.User.hasMany(db.Notification, {
    foreignKey: 'notification_by',
    as: 'notification_user',
});
db.Notification.belongsTo(db.User, {
    foreignKey: 'notification_by',
    as: 'notification_by_user',
});

db.User.hasMany(db.Notification, {
    foreignKey: 'notification_to',
    as: 'notification_to_user'
});
db.Notification.belongsTo(db.User, {
    foreignKey: 'notification_to',
    as:'user'
});

db.User.hasMany(db.Clock_entry, {
    foreignKey: 'worker_id',
    as: 'clock_entries'
});
db.Clock_entry.belongsTo(db.User, {
    foreignKey: 'worker_id',
    as: 'user'
});
// db.Company.hasMany(db.Clock_entry, {
//     foreignKey: 'company_id',
//     as: 'company_clock_entries'
// });
// db.Clock_entry.belongsTo(db.Company, {
//     foreignKey: 'company_id',
//     as: 'company'
// });
db.Project.hasMany(db.Clock_entry, {
    foreignKey: 'project_id',
    as: 'project_clock_entries'
});
db.Clock_entry.belongsTo(db.Project, {
    foreignKey: 'project_id',
    as: 'project'
});


module.exports = db;